/* global THREE */
/* eslint-disable no-console */
import './Model3DAnnotationsDemo.scss';

// ---------------------------------------------------------------------------
// DEMO ONLY — 3D annotations spike. All persistence is faked in localStorage.
//
// Camera pose storage schema (proposed Annotations v2 `target` shape):
//   target: {
//       type: 'model3d',
//       location: { type: 'model3d', value: 1 },
//       point: { x, y, z },              // world-space raycast anchor (comment pin)
//       camera: {
//           quaternion: { x, y, z, w },   // camera orientation (orbit controller reads this)
//           pivot: { x, y, z },           // orbit pivot in world space
//           orbitDistance: number,        // zoom / distance from pivot
//           cameraType: 'perspective' | 'orthographic',
//       },
//       drawing: {                        // present only for draw-mode annotations
//           paths: [{ points: [{ xPercent, yPercent }, ...], color }],
//       },
//   }
//
// NOTE: We do NOT store camera.position. OrbitCamera.onPreUpdate() recomputes
// position every frame from (quaternion + orbitDistance + pivot), so setting
// position directly is overwritten immediately. We restore via the orbit
// controller instead, then let the update loop place the camera correctly.
//
// NOTE: OrbitCamera drives orbiting by writing straight to
// `camera.runtimeData.quaternion` (the live three.js object) via slerp()/lookAt(),
// bypassing the Box3D entity property system. `camera.getQuaternion()` reads the
// entity's stored `quaternion` PROPERTY, which nothing updates during a drag — it
// always returns the camera's original orientation. So pose capture/compare must
// read the live `runtimeData.quaternion`, never `getQuaternion()`.
//
// Drawings are captured as 2D strokes in SCREEN-SPACE PERCENTAGES (like a Page
// annotation's Rect) while the camera is frozen at the draft's pose — same
// mental model as drawing on a paused video frame. Because the stroke has no 3D
// anchor, it's only meaningful from that exact viewpoint, so it's shown ONLY
// when the live camera pose matches the saved pose within a small tolerance
// (see POSE_MATCH_* below and isPoseNearCamera()).
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = 'bp-model3d-annotations-demo/';
const FAKE_LATENCY_MS = 150;
const FLY_DURATION_MS = 900;
const CLICK_DRAG_THRESHOLD_PX = 4;
const FALLBACK_ANCHOR_DISTANCE = 5;
const DEMO_USER = { initials: 'EW', name: 'Ed Wang' };
const DRAWING_COLOR = '#ed3757'; // bdl-watermelon-red, matches the real annotation color picker
const DRAWING_STROKE_WIDTH = 3;
const PAN_SPEED = 1.5; // multiplier for pivot translation relative to drag distance

// A drawing is only shown when the live camera is within these tolerances of the
// pose it was drawn at — dot product of quaternions close to 1 = same orientation;
// orbitDistance ratio close to 1 = same zoom; pivot distance small = same focus point.
const POSE_MATCH_QUATERNION_DOT = 0.999;
const POSE_MATCH_DISTANCE_RATIO = 0.05;
const POSE_MATCH_PIVOT_EPSILON = 0.05;

/** Fake stand-in for Box Annotations API v2. Swap for real endpoints if this gets API buy-in. */
const fakeAnnotationsApi = {
    list(fileId) {
        return new Promise(resolve => {
            setTimeout(() => {
                let entries = [];
                try {
                    entries = JSON.parse(localStorage.getItem(STORAGE_PREFIX + fileId)) || [];
                } catch (err) {
                    entries = [];
                }
                resolve(entries);
            }, FAKE_LATENCY_MS);
        });
    },
    create(fileId, annotation) {
        return fakeAnnotationsApi.list(fileId).then(entries => {
            entries.push(annotation);
            localStorage.setItem(STORAGE_PREFIX + fileId, JSON.stringify(entries));
            return annotation;
        });
    },
    remove(fileId, annotationId) {
        return fakeAnnotationsApi.list(fileId).then(entries => {
            const remaining = entries.filter(entry => entry.id !== annotationId);
            localStorage.setItem(STORAGE_PREFIX + fileId, JSON.stringify(remaining));
            return remaining;
        });
    },
};

class Model3DAnnotationsDemo {
    /** @property {Object[]} - Loaded annotations (comments and drawings) */
    annotations = [];

    /** @property {Object|null} - In-flight comment draft: { anchor, cameraPose, pinEl, popupEl } */
    draft = null;

    /** @property {boolean} - Whether click-to-comment placement mode is active */
    isPlacementMode = false;

    /** @property {boolean} - Whether freehand draw mode is active */
    isDrawMode = false;

    /** @property {Object|null} - In-flight drawing: { cameraPose, paths, currentPath, svgEl } */
    drawingDraft = null;

    /** @property {boolean} - Whether pan (spacebar-hold, or the Pan toolbar toggle) is active */
    isPanMode = false;

    /** @property {boolean} - Whether the spacebar is currently held (temporary pan) */
    isSpaceHeld = false;

    /** @property {Object|null} - In-progress pan drag: { lastX, lastY } */
    panDrag = null;

    /** @property {number} - requestAnimationFrame id for the pin/drawing re-projection loop */
    rafId = 0;

    /**
     * @param {Object} config
     * @param {HTMLElement} config.containerEl - Viewer wrapper element
     * @param {string} config.fileId - Box file ID used as storage key
     * @param {Model3DRenderer} config.renderer - The model3d renderer
     * @param {Function} config.onPlacementModeChange - Called with (boolean) when comment mode toggles
     * @param {Function} config.onDrawModeChange - Called with (boolean) when draw mode toggles
     * @param {Function} config.onPanModeChange - Called with (boolean) when pan mode toggles
     */
    constructor({ containerEl, fileId, renderer, onPlacementModeChange, onDrawModeChange, onPanModeChange }) {
        this.containerEl = containerEl;
        this.fileId = fileId;
        this.renderer = renderer;
        this.onPlacementModeChange = onPlacementModeChange || (() => {});
        this.onDrawModeChange = onDrawModeChange || (() => {});
        this.onPanModeChange = onPanModeChange || (() => {});

        this.handleCanvasMouseDown = this.handleCanvasMouseDown.bind(this);
        this.handleCanvasMouseMove = this.handleCanvasMouseMove.bind(this);
        this.handleCanvasMouseUp = this.handleCanvasMouseUp.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.updatePins = this.updatePins.bind(this);
    }

    init() {
        if (!this.renderer || !this.renderer.box3d || !this.renderer.box3d.canvas) {
            return;
        }

        this.buildDom();
        this.attachListeners();
        this.rafId = window.requestAnimationFrame(this.updatePins);

        fakeAnnotationsApi.list(this.fileId).then(entries => {
            this.annotations = entries;
            entries.forEach(annotation => this.addAnnotationEl(annotation));
        });

        window.__model3dAnnotationsDemo = this;
    }

    destroy() {
        window.cancelAnimationFrame(this.rafId);
        this.detachListeners();
        this.cancelDraft();
        this.cancelDrawingDraft();
        this.containerEl.classList.remove('bp-m3da-crosshair', 'bp-m3da-grab', 'bp-m3da-grabbing');

        if (this.rootEl && this.rootEl.parentNode) {
            this.rootEl.parentNode.removeChild(this.rootEl);
        }
        this.rootEl = null;

        if (window.__model3dAnnotationsDemo === this) {
            delete window.__model3dAnnotationsDemo;
        }
    }

    // ------------------------------------------------------------------ DOM

    buildDom() {
        this.rootEl = document.createElement('div');
        this.rootEl.className = 'bp-m3da';
        this.rootEl.innerHTML = `
            <svg class="bp-m3da-drawings" preserveAspectRatio="none"></svg>
            <div class="bp-m3da-pins"></div>`;
        this.containerEl.appendChild(this.rootEl);
        this.pinsEl = this.rootEl.querySelector('.bp-m3da-pins');
        this.drawingsSvgEl = this.rootEl.querySelector('.bp-m3da-drawings');
    }

    attachListeners() {
        const { canvas } = this.renderer.box3d;
        canvas.addEventListener('mousedown', this.handleCanvasMouseDown);
        canvas.addEventListener('mousemove', this.handleCanvasMouseMove);
        canvas.addEventListener('mouseup', this.handleCanvasMouseUp);
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
    }

    detachListeners() {
        const canvas = this.renderer.box3d && this.renderer.box3d.canvas;
        if (canvas) {
            canvas.removeEventListener('mousedown', this.handleCanvasMouseDown);
            canvas.removeEventListener('mousemove', this.handleCanvasMouseMove);
            canvas.removeEventListener('mouseup', this.handleCanvasMouseUp);
        }
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
    }

    // ------------------------------------------------------- placement mode

    setPlacementMode(enabled) {
        if (enabled) {
            this.setDrawMode(false);
            this.setPanMode(false);
        }

        this.isPlacementMode = enabled;
        this.containerEl.classList.toggle('bp-m3da-crosshair', enabled);
        if (!enabled) {
            this.cancelDraft();
        }
        this.onPlacementModeChange(enabled);
    }

    // ------------------------------------------------------------ draw mode

    setDrawMode(enabled) {
        if (enabled) {
            this.setPlacementMode(false);
            this.setPanMode(false);
        }

        this.isDrawMode = enabled;
        this.containerEl.classList.toggle('bp-m3da-crosshair', enabled);
        this.renderer[enabled ? 'disableCameraControls' : 'enableCameraControls']();

        if (!enabled) {
            this.cancelDrawingDraft();
        } else {
            this.beginDrawingDraft();
        }
        this.onDrawModeChange(enabled);
    }

    beginDrawingDraft() {
        const cameraPose = this.captureCameraPose();
        this.drawingDraft = { cameraPose, paths: [], currentPath: null };
    }

    // ------------------------------------------------------------- pan mode

    /**
     * Enable/disable pan mode. Pan translates the orbit pivot in the camera's
     * screen plane (right/up vectors) so drag feels like grabbing the model.
     * We disable the orbit controller while panning so the two don't fight.
     */
    setPanMode(enabled) {
        if (enabled === this.isPanMode) {
            return;
        }
        if (enabled) {
            this.setPlacementMode(false);
            this.setDrawMode(false);
        }

        this.isPanMode = enabled;
        this.containerEl.classList.toggle('bp-m3da-grab', enabled);
        this.renderer[enabled ? 'disableCameraControls' : 'enableCameraControls']();
        if (!enabled) {
            this.panDrag = null;
            this.containerEl.classList.remove('bp-m3da-grabbing');
        }
        this.onPanModeChange(enabled);
    }

    /** True when panning should be active — either the toolbar toggle or a held spacebar. */
    isPanning() {
        return this.isPanMode || this.isSpaceHeld;
    }

    handleKeyDown(event) {
        // Spacebar-hold: temporary pan, like most 3D tools. Ignore when typing in the popup.
        if (event.key === ' ' && !this.isSpaceHeld && !this.isTypingTarget(event.target)) {
            event.preventDefault();
            this.isSpaceHeld = true;
            if (!this.isPanMode) {
                this.renderer.disableCameraControls();
                this.containerEl.classList.add('bp-m3da-grab');
            }
            return;
        }

        // Cmd/Ctrl+Z: undo the last drawn stroke while a drawing draft is active.
        if ((event.metaKey || event.ctrlKey) && (event.key === 'z' || event.key === 'Z') && this.drawingDraft) {
            event.preventDefault();
            this.undoLastStroke();
            return;
        }

        if (event.key !== 'Escape') {
            return;
        }

        if (this.isDrawMode) {
            event.stopPropagation();
            this.finishDrawing();
        } else if (this.isPlacementMode || this.draft) {
            event.stopPropagation();
            this.setPlacementMode(false);
        }
    }

    handleKeyUp(event) {
        if (event.key === ' ' && this.isSpaceHeld) {
            this.isSpaceHeld = false;
            this.panDrag = null;
            if (!this.isPanMode) {
                this.renderer.enableCameraControls();
                this.containerEl.classList.remove('bp-m3da-grab', 'bp-m3da-grabbing');
            }
        }
    }

    /** Whether an element is a text input we shouldn't hijack spacebar/undo from. */
    isTypingTarget(el) {
        if (!el || !el.tagName) {
            return false;
        }
        const tag = el.tagName.toLowerCase();
        return tag === 'input' || tag === 'textarea' || el.isContentEditable;
    }

    /** Remove the most recent completed stroke from the active drawing draft. */
    undoLastStroke() {
        if (!this.drawingDraft || this.drawingDraft.paths.length === 0) {
            return;
        }
        this.drawingDraft.paths.pop();
        this.drawingDraft.currentPath = null;
        this.renderDraftStrokes();
    }

    /**
     * Pan the camera by translating the orbit pivot along the camera's right/up
     * axes by the drag delta (scaled to world units at the current zoom).
     */
    panByDrag(dx, dy) {
        const camera = this.getCameraEntity();
        const orbit = this.getOrbitController();
        const { canvas } = this.renderer.box3d;
        if (!camera || !camera.runtimeData || !orbit || !orbit.pivotPoint) {
            return;
        }

        const threeCamera = camera.runtimeData;
        const distance = orbit.getOrbitDistance() || FALLBACK_ANCHOR_DISTANCE;
        // Convert pixel delta to world units: fraction of viewport * world extent at pivot depth.
        const rect = canvas.getBoundingClientRect();
        const worldPerPixel = (2 * distance * Math.tan(((threeCamera.fov || 60) * Math.PI) / 360)) / rect.height;

        const right = new THREE.Vector3().setFromMatrixColumn(threeCamera.matrixWorld, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(threeCamera.matrixWorld, 1);

        const pan = new THREE.Vector3();
        pan.addScaledVector(right, -dx * worldPerPixel * PAN_SPEED);
        pan.addScaledVector(up, dy * worldPerPixel * PAN_SPEED);

        const pivot = orbit.pivotPoint.position;
        orbit.setPivotPosition(new THREE.Vector3(pivot.x + pan.x, pivot.y + pan.y, pivot.z + pan.z));
        this.renderer.box3d.needsRender = true;
    }

    // ---------------------------------------------------------- pointer i/o

    getCanvasRelativePosition(event) {
        const { canvas } = this.renderer.box3d;
        const rect = canvas.getBoundingClientRect();
        return {
            xPercent: (event.clientX - rect.left) / rect.width,
            yPercent: (event.clientY - rect.top) / rect.height,
        };
    }

    handleCanvasMouseDown(event) {
        this.mouseDownPoint = { x: event.clientX, y: event.clientY };

        if (this.isPanning()) {
            this.panDrag = { lastX: event.clientX, lastY: event.clientY };
            this.containerEl.classList.add('bp-m3da-grabbing');
            return;
        }

        if (this.isDrawMode && this.drawingDraft) {
            this.isStrokeActive = true;
            this.drawingDraft.currentPath = {
                color: DRAWING_COLOR,
                points: [this.getCanvasRelativePosition(event)],
            };
            this.drawingDraft.paths.push(this.drawingDraft.currentPath);
        }
    }

    handleCanvasMouseMove(event) {
        if (this.panDrag) {
            this.panByDrag(event.clientX - this.panDrag.lastX, event.clientY - this.panDrag.lastY);
            this.panDrag.lastX = event.clientX;
            this.panDrag.lastY = event.clientY;
            return;
        }

        if (!this.isStrokeActive || !this.drawingDraft || !this.drawingDraft.currentPath) {
            return;
        }

        this.drawingDraft.currentPath.points.push(this.getCanvasRelativePosition(event));
        this.renderDraftStrokes();
    }

    handleCanvasMouseUp(event) {
        if (this.panDrag) {
            this.panDrag = null;
            this.containerEl.classList.remove('bp-m3da-grabbing');
            return;
        }

        if (this.isStrokeActive) {
            this.isStrokeActive = false;
            if (this.drawingDraft && this.drawingDraft.currentPath && this.drawingDraft.currentPath.points.length < 2) {
                // A single click with no drag — discard the degenerate stroke.
                this.drawingDraft.paths.pop();
                this.renderDraftStrokes();
            }
            return;
        }

        if (!this.isPlacementMode || this.draft || !this.mouseDownPoint) {
            return;
        }

        const dx = event.clientX - this.mouseDownPoint.x;
        const dy = event.clientY - this.mouseDownPoint.y;
        if (Math.sqrt(dx * dx + dy * dy) > CLICK_DRAG_THRESHOLD_PX) {
            return;
        }

        this.openDraft(event);
    }

    // ------------------------------------------------------ camera & picking

    getCameraEntity() {
        return this.renderer.getCamera();
    }

    getOrbitController() {
        const camera = this.getCameraEntity();
        return camera ? camera.getComponentByScriptId('orbit_camera') : null;
    }

    /**
     * Capture the camera pose. We store orbit controller state (quaternion, pivot,
     * orbitDistance) NOT the raw camera position — see the file-level NOTE above.
     */
    captureCameraPose() {
        const camera = this.getCameraEntity();
        if (!camera || !camera.runtimeData) {
            return null;
        }

        const { quaternion } = camera.runtimeData;
        const pose = {
            quaternion: { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
            pivot: null,
            orbitDistance: null,
            cameraType: camera.getProperty('cameraType'),
        };

        const orbit = this.getOrbitController();
        if (orbit) {
            pose.orbitDistance = orbit.getOrbitDistance();
            const pivotPos = orbit.pivotPoint && orbit.pivotPoint.position;
            if (pivotPos) {
                pose.pivot = { x: pivotPos.x, y: pivotPos.y, z: pivotPos.z };
            }
        }

        return pose;
    }

    /**
     * Whether the LIVE camera pose is close enough to `pose` that a screen-space
     * drawing captured at `pose` would still line up with the model. Compares
     * orientation (quaternion dot product), zoom (orbitDistance ratio), and pivot
     * position (world-space distance) against small tolerances.
     */
    isPoseNearCamera(pose) {
        const camera = this.getCameraEntity();
        const orbit = this.getOrbitController();
        if (!camera || !camera.runtimeData || !orbit || !pose || !pose.pivot) {
            return false;
        }

        const { quaternion } = camera.runtimeData;
        const dot =
            quaternion.x * pose.quaternion.x +
            quaternion.y * pose.quaternion.y +
            quaternion.z * pose.quaternion.z +
            quaternion.w * pose.quaternion.w;
        if (Math.abs(dot) < POSE_MATCH_QUATERNION_DOT) {
            return false;
        }

        const liveDistance = orbit.getOrbitDistance();
        if (pose.orbitDistance) {
            const ratio = Math.abs(liveDistance - pose.orbitDistance) / pose.orbitDistance;
            if (ratio > POSE_MATCH_DISTANCE_RATIO) {
                return false;
            }
        }

        const livePivot = orbit.pivotPoint.position;
        const pivotDelta = Math.sqrt(
            (livePivot.x - pose.pivot.x) ** 2 + (livePivot.y - pose.pivot.y) ** 2 + (livePivot.z - pose.pivot.z) ** 2,
        );
        // Scale the pivot tolerance to the current zoom level so it works at any model size.
        const scaledEpsilon = POSE_MATCH_PIVOT_EPSILON * (pose.orbitDistance || 1);
        return pivotDelta <= scaledEpsilon;
    }

    /**
     * Restore a saved camera pose by writing back into the orbit controller.
     * The orbit controller's onPreUpdate() will recompute the camera's world
     * position from these values on the very next frame.
     */
    applyCameraPose(pose, animate = true) {
        const camera = this.getCameraEntity();
        const orbit = this.getOrbitController();
        if (!camera || !pose || !orbit) {
            return;
        }

        if (pose.cameraType && camera.getProperty('cameraType') !== pose.cameraType) {
            camera.setProperty('cameraType', pose.cameraType);
        }

        const applyInstant = () => {
            if (pose.pivot) {
                orbit.setPivotPosition(new THREE.Vector3(pose.pivot.x, pose.pivot.y, pose.pivot.z));
            }
            if (pose.orbitDistance != null) {
                orbit.setOrbitDistance(pose.orbitDistance);
            }
            const { runtimeData } = camera;
            if (runtimeData) {
                runtimeData.quaternion.set(pose.quaternion.x, pose.quaternion.y, pose.quaternion.z, pose.quaternion.w);
                // Freeze the orbit controller's internal eulerStart so the next drag
                // continues from the restored orientation, not the previous one.
                orbit.resetOrbitRotation();
            }
            this.renderer.box3d.needsRender = true;
        };

        if (!animate) {
            applyInstant();
            return;
        }

        // Animated fly: interpolate from current orbit state to target, then apply exactly.
        const fromQ = camera.runtimeData.quaternion.clone();
        const toQ = new THREE.Quaternion(pose.quaternion.x, pose.quaternion.y, pose.quaternion.z, pose.quaternion.w);
        const fromDist = orbit.getOrbitDistance();
        const toDist = pose.orbitDistance != null ? pose.orbitDistance : fromDist;
        const fromPivot = orbit.pivotPoint ? orbit.pivotPoint.position.clone() : new THREE.Vector3();
        const toPivot = pose.pivot ? new THREE.Vector3(pose.pivot.x, pose.pivot.y, pose.pivot.z) : fromPivot.clone();

        const interpQ = new THREE.Quaternion();
        const interpPivot = new THREE.Vector3();
        const startTime = performance.now();

        const step = now => {
            const t = Math.min((now - startTime) / FLY_DURATION_MS, 1);
            const eased = t * t * (3 - 2 * t); // smoothstep

            THREE.Quaternion.slerp(fromQ, toQ, interpQ, eased);
            interpPivot.lerpVectors(fromPivot, toPivot, eased);

            orbit.setPivotPosition(interpPivot.clone());
            orbit.setOrbitDistance(fromDist + (toDist - fromDist) * eased);

            const { runtimeData } = camera;
            if (runtimeData) {
                runtimeData.quaternion.copy(interpQ);
            }
            this.renderer.box3d.needsRender = true;

            if (t < 1) {
                window.requestAnimationFrame(step);
            } else {
                applyInstant();
            }
        };

        window.requestAnimationFrame(step);
    }

    /** Raycast the click; falls back to a point along the ray if the model is missed. */
    pickAnchorPoint(event) {
        const { canvas } = this.renderer.box3d;
        const threeCamera = this.getCameraEntity().runtimeData;
        const scene = this.renderer.getScene().runtimeData;
        const rect = canvas.getBoundingClientRect();

        const ndc = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1,
        );

        threeCamera.updateMatrixWorld();
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(ndc, threeCamera);

        const hits = raycaster.intersectObjects(scene.children, true).filter(h => h.object && h.object.isMesh);
        if (hits.length > 0) {
            const { point } = hits[0];
            return { x: point.x, y: point.y, z: point.z };
        }

        const orbit = this.getOrbitController();
        const dist = (orbit && orbit.getOrbitDistance()) || FALLBACK_ANCHOR_DISTANCE;
        const fallback = raycaster.ray.at(dist, new THREE.Vector3());
        return { x: fallback.x, y: fallback.y, z: fallback.z };
    }

    // ---------------------------------------------------------- comment draft

    openDraft(event) {
        const anchor = this.pickAnchorPoint(event);
        const cameraPose = this.captureCameraPose();

        this.renderer.disableCameraControls();

        const pinEl = this.createPinEl('+', true);
        const popupEl = document.createElement('div');
        popupEl.className = 'bp-m3da-popup';
        popupEl.innerHTML = `
            <textarea class="bp-m3da-popup-input" placeholder="Comment on this view…" rows="3"></textarea>
            <div class="bp-m3da-popup-actions">
                <button type="button" class="bp-m3da-btn bp-m3da-btn-cancel">Cancel</button>
                <button type="button" class="bp-m3da-btn bp-m3da-btn-save">Comment</button>
            </div>`;
        this.pinsEl.appendChild(popupEl);

        this.draft = { anchor, cameraPose, pinEl, popupEl };

        const inputEl = popupEl.querySelector('.bp-m3da-popup-input');
        popupEl.querySelector('.bp-m3da-btn-cancel').addEventListener('click', () => this.setPlacementMode(false));
        popupEl.querySelector('.bp-m3da-btn-save').addEventListener('click', () => this.saveDraft(inputEl.value));
        inputEl.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.saveDraft(inputEl.value);
            }
        });
        inputEl.focus();
    }

    cancelDraft() {
        if (!this.draft) {
            return;
        }

        this.draft.pinEl.remove();
        this.draft.popupEl.remove();
        this.draft = null;
        this.renderer.enableCameraControls();
    }

    saveDraft(message) {
        const trimmed = (message || '').trim();
        if (!this.draft || !trimmed) {
            return;
        }

        const { anchor, cameraPose } = this.draft;
        const annotation = {
            id: `demo_${Date.now()}_${this.annotations.length}`,
            type: 'comment',
            message: trimmed,
            createdAt: new Date().toISOString(),
            createdBy: { ...DEMO_USER },
            target: {
                type: 'model3d',
                location: { type: 'model3d', value: 1 },
                point: anchor,
                camera: cameraPose,
            },
        };

        fakeAnnotationsApi.create(this.fileId, annotation).then(() => {
            this.annotations.push(annotation);
            this.addAnnotationEl(annotation);
            this.setPlacementMode(false);
            this.flashPin(annotation.id);
        });
    }

    // ---------------------------------------------------------- draw draft

    renderDraftStrokes() {
        if (!this.drawingDraft) {
            return;
        }
        this.renderStrokesIntoSvg(this.drawingsSvgEl, this.drawingDraft.paths, 'bp-m3da-draft-stroke');
    }

    finishDrawing() {
        if (!this.drawingDraft) {
            this.setDrawMode(false);
            return;
        }

        const { cameraPose, paths } = this.drawingDraft;
        const validPaths = paths.filter(path => path.points.length >= 2);

        if (validPaths.length === 0) {
            this.setDrawMode(false);
            return;
        }

        const annotation = {
            id: `demo_${Date.now()}_${this.annotations.length}`,
            type: 'drawing',
            message: '',
            createdAt: new Date().toISOString(),
            createdBy: { ...DEMO_USER },
            target: {
                type: 'model3d',
                location: { type: 'model3d', value: 1 },
                camera: cameraPose,
                drawing: { paths: validPaths },
            },
        };

        fakeAnnotationsApi.create(this.fileId, annotation).then(() => {
            this.annotations.push(annotation);
            this.addAnnotationEl(annotation);
            this.setDrawMode(false);
        });
    }

    cancelDrawingDraft() {
        if (!this.drawingDraft) {
            return;
        }

        this.drawingDraft = null;
        this.isStrokeActive = false;
        this.renderVisibleDrawings();
        this.renderer.enableCameraControls();
    }

    // ----------------------------------------------------------- annotations

    deleteAnnotation(annotationId) {
        fakeAnnotationsApi.remove(this.fileId, annotationId).then(remaining => {
            this.annotations = remaining;
            const pinEl = this.pinsEl.querySelector(`[data-annotation-id="${annotationId}"]`);
            if (pinEl) {
                pinEl.remove();
            }
            this.renderVisibleDrawings();
        });
    }

    addAnnotationEl(annotation) {
        if (annotation.type === 'drawing') {
            // Drawings have no pin — visibility is pose-driven, handled in updatePins().
            return;
        }
        this.addPinEl(annotation);
    }

    // ----------------------------------------------------------------- pins

    createPinEl(label, isDraft = false) {
        const pinEl = document.createElement('button');
        pinEl.type = 'button';
        pinEl.className = `bp-m3da-pin${isDraft ? ' bp-m3da-pin-draft' : ''}`;
        pinEl.textContent = label;
        this.pinsEl.appendChild(pinEl);
        return pinEl;
    }

    addPinEl(annotation) {
        const commentAnnotations = this.annotations.filter(a => a.type !== 'drawing');
        const index = commentAnnotations.indexOf(annotation);
        const pinEl = this.createPinEl(String(index + 1));
        pinEl.dataset.annotationId = annotation.id;

        // Clicking a saved pin flies the camera back and shows a mini tooltip.
        pinEl.addEventListener('click', () => this.focusAnnotation(annotation));
        return pinEl;
    }

    /**
     * Re-project comment pins into screen space, and re-render drawings whose saved
     * pose currently matches the live camera. Runs on rAF — cheap: drawings only
     * redraw their DOM when the pose-match set actually changes.
     */
    updatePins() {
        this.rafId = window.requestAnimationFrame(this.updatePins);

        const camera = this.getCameraEntity();
        if (!camera || !camera.runtimeData || !this.rootEl) {
            return;
        }

        const threeCamera = camera.runtimeData;
        const { canvas } = this.renderer.box3d;
        const canvasRect = canvas.getBoundingClientRect();
        const rootRect = this.rootEl.getBoundingClientRect();
        const projected = new THREE.Vector3();

        const positionEl = (el, point, yOffset = 0) => {
            projected.set(point.x, point.y, point.z).project(threeCamera);
            const isFront = projected.z < 1;
            const x = ((projected.x + 1) / 2) * canvasRect.width + (canvasRect.left - rootRect.left);
            const y = ((1 - projected.y) / 2) * canvasRect.height + (canvasRect.top - rootRect.top);
            el.classList.toggle('bp-is-hidden', !isFront);
            el.style.transform = `translate(-50%, -100%) translate(${x}px, ${y + yOffset}px)`;
        };

        this.annotations.forEach(annotation => {
            if (annotation.type === 'drawing') {
                return;
            }

            const pinEl = this.pinsEl.querySelector(`[data-annotation-id="${annotation.id}"]`);
            if (pinEl) {
                positionEl(pinEl, annotation.target.point);
            }

            const tooltipEl = this.pinsEl.querySelector(
                `.bp-m3da-pin-tooltip[data-anchor-annotation-id="${annotation.id}"]`,
            );
            if (tooltipEl) {
                positionEl(tooltipEl, annotation.target.point, 10);
            }
        });

        if (this.draft) {
            positionEl(this.draft.pinEl, this.draft.anchor);
            positionEl(this.draft.popupEl, this.draft.anchor, 10);
        }

        if (!this.isDrawMode) {
            this.renderVisibleDrawings();
        }
    }

    /** Render every saved drawing whose pose matches the live camera; clear the rest. */
    renderVisibleDrawings() {
        if (!this.drawingsSvgEl) {
            return;
        }

        const visiblePaths = this.annotations
            .filter(a => a.type === 'drawing' && this.isPoseNearCamera(a.target.camera))
            .flatMap(a => a.target.drawing.paths);

        this.renderStrokesIntoSvg(this.drawingsSvgEl, visiblePaths, 'bp-m3da-stroke');
    }

    /** Render a flat list of { points, color } paths as SVG polylines, replacing prior content. */
    renderStrokesIntoSvg(svgEl, paths, className) {
        const rect = svgEl.getBoundingClientRect();
        svgEl.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
        svgEl.innerHTML = paths
            .map(path => {
                const pointsAttr = path.points
                    .map(p => `${(p.xPercent * rect.width).toFixed(1)},${(p.yPercent * rect.height).toFixed(1)}`)
                    .join(' ');
                return `<polyline class="${className}" points="${pointsAttr}" stroke="${path.color}" stroke-width="${DRAWING_STROKE_WIDTH}" fill="none" />`;
            })
            .join('');
    }

    // ---------------------------------------------------------------- focus

    focusAnnotation(annotation) {
        this.applyCameraPose(annotation.target.camera);
        this.flashPin(annotation.id);
        this.showPinTooltip(annotation);
    }

    flashPin(annotationId) {
        const pinEl = this.pinsEl.querySelector(`[data-annotation-id="${annotationId}"]`);
        if (!pinEl) {
            return;
        }
        pinEl.classList.remove('bp-m3da-flash');
        void pinEl.offsetWidth; // eslint-disable-line no-void
        pinEl.classList.add('bp-m3da-flash');
    }

    /** Show a small tooltip bubble above the pin for ~4 s, then fade it out. */
    showPinTooltip(annotation) {
        const existing = this.pinsEl.querySelector('.bp-m3da-pin-tooltip');
        if (existing) {
            existing.remove();
        }

        const commentAnnotations = this.annotations.filter(a => a.type !== 'drawing');
        const index = commentAnnotations.indexOf(annotation);
        const tooltipEl = document.createElement('div');
        tooltipEl.className = 'bp-m3da-pin-tooltip';
        tooltipEl.innerHTML = `
            <div class="bp-m3da-tooltip-header">
                <span class="bp-m3da-tooltip-avatar">${annotation.createdBy.initials}</span>
                <span class="bp-m3da-tooltip-name">${annotation.createdBy.name}</span>
                <span class="bp-m3da-tooltip-index">View ${index + 1}</span>
                <button type="button" class="bp-m3da-tooltip-delete" title="Delete">×</button>
            </div>
            <div class="bp-m3da-tooltip-message"></div>`;
        tooltipEl.querySelector('.bp-m3da-tooltip-message').textContent = annotation.message;
        tooltipEl.querySelector('.bp-m3da-tooltip-delete').addEventListener('click', e => {
            e.stopPropagation();
            this.deleteAnnotation(annotation.id);
            tooltipEl.remove();
        });
        this.pinsEl.appendChild(tooltipEl);

        // Position it — we'll let updatePins handle subsequent frames.
        tooltipEl.dataset.anchorAnnotationId = annotation.id;

        // Auto-dismiss after 4 s.
        setTimeout(() => {
            tooltipEl.classList.add('bp-m3da-tooltip-fade');
            setTimeout(() => tooltipEl.remove(), 400);
        }, 4000);
    }
}

export default Model3DAnnotationsDemo;
