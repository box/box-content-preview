/* global THREE */
/* eslint-disable no-console */
import { getHeaders } from '../../../util';
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
const DEFAULT_DRAWING_COLOR = '#ed3757'; // bdl-watermelon-red, matches the real annotation color picker
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
    update(fileId, annotationId, patch) {
        return fakeAnnotationsApi.list(fileId).then(entries => {
            const updated = entries.map(entry => (entry.id === annotationId ? { ...entry, ...patch } : entry));
            localStorage.setItem(STORAGE_PREFIX + fileId, JSON.stringify(updated));
            return updated;
        });
    },
};

// How often we re-check the Activity feed for comments that were marked resolved
// (there's no push channel from the sidebar into Preview, so we poll).
const RESOLVED_POLL_MS = 5000;

// DEMO ONLY — which synthetic model version a comment is "created on" vs.
// "resolved on". The version-diff overlay synthesizes v1/v2/v3 from the live
// geometry (see Model3DVersionDiff), so we can't read a real version off the
// backend; we stamp these deterministic defaults so navigating to a resolved
// comment can open a meaningful before/after diff (original → turret rotated).
const DEFAULT_CREATED_VERSION = 'v1';
const DEFAULT_RESOLVED_VERSION = 'v2';

// Width (px) of the demo Activity sidebar. The 3D viewport is narrowed by this
// much so the model isn't hidden behind the panel (mirrors how the real Box
// sidebar reserves space on the right).
const PANEL_WIDTH = 400;

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

    /** @property {Object|null} - In-progress region-box drag (placement mode): { startX, startY, el } */
    boxDrag = null;

    /** @property {HTMLElement|null} - Fixed composer shown while captioning a freehand drawing */
    drawComposerEl = null;

    /** @property {number} - requestAnimationFrame id for the pin/drawing re-projection loop */
    rafId = 0;

    /**
     * @param {Object} config
     * @param {HTMLElement} config.containerEl - Viewer wrapper element
     * @param {string} [config.drawingColor] - Initial stroke color from the annotation color picker
     * @param {string} config.fileId - Box file ID used as storage key
     * @param {Model3DRenderer} config.renderer - The model3d renderer
     * @param {Object} [config.api] - Preview Api client (axios wrapper) for posting real comments
     * @param {string} [config.apiHost] - Box API host, e.g. https://api.box.com
     * @param {string} [config.token] - Auth token used to post comments as the current user
     * @param {string} [config.sharedLink] - Optional shared link for auth
     * @param {string} [config.sharedLinkPassword] - Optional shared link password
     * @param {Function} config.onPlacementModeChange - Called with (boolean) when comment mode toggles
     * @param {Function} config.onDrawModeChange - Called with (boolean) when draw mode toggles
     * @param {Function} config.onPanModeChange - Called with (boolean) when pan mode toggles
     * @param {Function} [config.onResolvedFocus] - Called with (createdVersionId, resolvedVersionId) when a
     *        resolved comment is navigated to; the viewer opens the version diff on that pair
     * @param {Function} [config.onResolvedBlur] - Called when the resolved-comment focus is cleared
     */
    constructor({
        containerEl,
        drawingColor,
        fileId,
        renderer,
        api,
        apiHost,
        token,
        sharedLink,
        sharedLinkPassword,
        onPlacementModeChange,
        onDrawModeChange,
        onPanModeChange,
        onResolvedFocus,
        onResolvedBlur,
    }) {
        this.containerEl = containerEl;
        this.drawingColor = drawingColor || DEFAULT_DRAWING_COLOR;
        this.fileId = fileId;
        this.renderer = renderer;
        this.api = api;
        this.apiHost = apiHost;
        this.token = token;
        this.sharedLink = sharedLink;
        this.sharedLinkPassword = sharedLinkPassword;
        this.onPlacementModeChange = onPlacementModeChange || (() => {});
        this.onDrawModeChange = onDrawModeChange || (() => {});
        this.onPanModeChange = onPanModeChange || (() => {});
        this.onResolvedFocus = onResolvedFocus || (() => {});
        this.onResolvedBlur = onResolvedBlur || (() => {});

        // Id of the resolved annotation currently being viewed (via navigation),
        // or null. While set, ONLY this pin is shown and the version diff is open
        // on the comment's created→resolved versions.
        this.resolvedFocusId = null;

        this.handlePanelClick = this.handlePanelClick.bind(this);
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
            this.startResolvedPolling();
            this.renderPanel();
        });

        window.__model3dAnnotationsDemo = this;
    }

    destroy() {
        window.cancelAnimationFrame(this.rafId);
        if (this.resolvedPollId) {
            window.clearInterval(this.resolvedPollId);
            this.resolvedPollId = null;
        }
        this.detachListeners();
        this.cancelDraft();
        this.cancelDrawingDraft();
        this.containerEl.classList.remove('bp-m3da-crosshair', 'bp-m3da-grab', 'bp-m3da-grabbing');

        if (this.rootEl && this.rootEl.parentNode) {
            this.rootEl.parentNode.removeChild(this.rootEl);
        }
        this.rootEl = null;

        if (this.panelListEl) {
            this.panelListEl.removeEventListener('click', this.handlePanelClick);
        }
        if (this.panelEl && this.panelEl.parentNode) {
            this.panelEl.parentNode.removeChild(this.panelEl);
        }
        this.panelEl = null;
        this.panelListEl = null;
        this.clearViewportInset();

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

        // DEMO: a self-contained "Activity" sidebar. The real box-ui-elements
        // sidebar renders in a browsing context Preview can't reach (proven at
        // runtime: top frame, zero comment cards, zero iframes), so DOM-injecting
        // into it is impossible. Instead we render our own faithful replica we
        // fully control — a card per comment with the blue xyz / "v1 ↔ v2" chip;
        // clicking a card flies the camera (and opens the version diff when the
        // comment is resolved). The rail of icons on the left mirrors the real
        // sidebar tabs (only the comments tab does anything).
        this.panelEl = document.createElement('div');
        this.panelEl.className = 'bp-m3da-sidebar';
        // Rail on the LEFT, comments panel on the right. Icons are copied
        // verbatim from the real box-ui-elements sidebar nav (Activity, Details,
        // Metadata + the Add-integrations overflow and the collapse toggle);
        // Box AI and Slack are intentionally omitted for the demo.
        this.panelEl.innerHTML = `
            <div class="bp-m3da-rail">
                <div class="bp-m3da-rail-tabs">
                    <button type="button" class="bp-m3da-rail-icon bp-m3da-rail-active" title="Activity" aria-label="Activity">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" role="img"><path fill="#909090" fill-rule="evenodd" d="M4 11c0-2.297.683-3.999 1.926-5.138C7.18 4.712 9.155 4 12 4c2.845 0 4.819.711 6.074 1.862C19.317 7.001 20 8.702 20 11c0 2.297-.683 3.999-1.926 5.138C16.82 17.288 14.845 18 12 18h-.459a1.1 1.1 0 0 0-.774.318C9.665 19.41 8.243 20.048 7.16 20.2c-.553.078-.905.013-1.07-.065C6 20.09 6 20.084 6 20V20c0-.22.072-.347.361-.813.285-.458.665-1.104.685-2.104a1.1 1.1 0 0 0-.606-1.005C4.885 15.298 4 13.745 4 11Zm8-9c-3.155 0-5.681.789-7.426 2.388C2.817 5.999 2 8.298 2 11c0 2.938.91 5.227 2.966 6.539a2.79 2.79 0 0 1-.303.592l-.055.088C4.372 18.591 4 19.18 4 20c0 .912.496 1.59 1.23 1.94.657.313 1.453.345 2.205.24 1.428-.2 3.108-.95 4.464-2.18H12c3.155 0 5.681-.789 7.426-2.388C21.183 16.001 22 13.702 22 11c0-2.703-.817-5.001-2.574-6.612C17.68 2.788 15.155 2 12 2ZM8 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm5-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd"></path></svg>
                    </button>
                    <button type="button" class="bp-m3da-rail-icon" title="Details" aria-label="Details">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" role="img"><path fill="#909090" fill-rule="evenodd" d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0 2c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Zm-2-11a1 1 0 0 1 1-1h.5a1.5 1.5 0 0 1 1.5 1.5V15a1 1 0 1 1 0 2h-.5a1.5 1.5 0 0 1-1.5-1.5V12a1 1 0 0 1-1-1Zm2-2a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd"></path></svg>
                    </button>
                    <button type="button" class="bp-m3da-rail-icon" title="Metadata" aria-label="Metadata">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" role="img"><path fill="#909090" fill-rule="evenodd" d="M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm2 0c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10ZM9 15c0-2.032.002-3.454.117-4.376.023-.184.049-.329.074-.441l.072.082c.235.283.475.697.718 1.182.118.237.23.476.34.71l.024.053c.099.212.198.425.292.612.097.194.212.41.338.587.063.088.157.207.285.314.118.098.374.277.74.277s.622-.179.74-.277c.128-.107.222-.226.285-.314.126-.177.241-.393.338-.587.094-.187.193-.4.292-.611l.025-.054c.11-.234.221-.473.34-.71.242-.485.482-.9.717-1.182l.072-.082c.025.112.05.257.074.441.115.922.117 2.344.117 4.376a1 1 0 1 0 2 0v-.085c0-1.928 0-3.477-.133-4.539-.066-.53-.178-1.065-.417-1.491a1.78 1.78 0 0 0-.573-.629A1.588 1.588 0 0 0 15 8c-.835 0-1.435.547-1.8.985-.39.467-.712 1.053-.97 1.568a24 24 0 0 0-.23.475 24 24 0 0 0-.23-.475c-.258-.515-.58-1.1-.97-1.568C10.434 8.547 9.834 8 9 8c-.302 0-.605.079-.877.257a1.78 1.78 0 0 0-.573.628c-.24.426-.351.962-.417 1.491C7 11.438 7 12.986 7 14.916V15a1 1 0 1 0 2 0Zm2.392-2.746.003-.004-.003.004Zm1.213-.004.003.004-.003-.004Z" clip-rule="evenodd"></path></svg>
                    </button>
                    <div class="bp-m3da-rail-divider"></div>
                    <button type="button" class="bp-m3da-rail-icon" title="Add integrations" aria-label="Add integrations">
                        <svg width="16" height="16" viewBox="0 0 16 16" role="img"><path fill="#909090" fill-rule="evenodd" d="M9 7h4.5a.5.5 0 01.5.5v1a.5.5 0 01-.5.5H9v4.5a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5V9H2.5a.5.5 0 01-.5-.5v-1a.5.5 0 01.5-.5H7V2.5a.5.5 0 01.5-.5h1a.5.5 0 01.5.5V7z"/></svg>
                    </button>
                </div>
                <div class="bp-m3da-rail-footer">
                    <button type="button" class="bp-m3da-rail-icon bp-m3da-rail-toggle" title="Hide Sidebar" aria-label="Hide Sidebar">
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" role="presentation"><path fill="#909090" d="M17 4a5 5 0 0 1 5 5v6a5 5 0 0 1-5 5H7a5 5 0 0 1-4.993-4.743L2 15V9a5 5 0 0 1 5-5h10ZM7 6a3 3 0 0 0-3 3v6l.004.155A3 3 0 0 0 7 18h3V6H7Zm5 12h5a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3h-5v12Zm2.293-8.707a1 1 0 0 1 1.414 0l2 2a1 1 0 0 1 0 1.414l-2 2a1 1 0 1 1-1.414-1.414L15.586 12l-1.293-1.293a1 1 0 0 1 0-1.414Z"></path></svg>
                    </button>
                </div>
            </div>
            <div class="bp-m3da-panel">
                <div class="bp-m3da-panel-topbar">
                    <span class="bp-m3da-panel-title">Activity</span>
                    <div class="bp-m3da-panel-topbar-actions">
                        <button type="button" class="bp-m3da-icon-btn" title="Filter" aria-label="Filter">
                            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M4 6h16v2H4V6zm3 5h10v2H7v-2zm3 5h4v2h-4v-2z"/></svg>
                        </button>
                        <button type="button" class="bp-m3da-addtask">Add Task <span class="bp-m3da-addtask-caret">▾</span></button>
                    </div>
                </div>
                <div class="bp-m3da-panel-body">
                    <div class="bp-m3da-version-divider"><span class="bp-m3da-version-label">Version Uploaded: <span class="bp-m3da-version-pill">V1</span></span></div>
                    <div class="bp-m3da-panel-list"></div>
                </div>
                <div class="bp-m3da-composer-bar">
                    <div class="bp-m3da-composer-field">Add a comment, @ to mention</div>
                    <button type="button" class="bp-m3da-composer-send-round" aria-label="Send">
                        <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 4l-1.4 1.4L16.2 11H4v2h12.2l-5.6 5.6L12 20l8-8z" transform="rotate(-90 12 12)"/></svg>
                    </button>
                </div>
            </div>`;
        // Append the sidebar as a SIBLING of the 3D wrapper (in the preview
        // container), so it fills the reserved right strip rather than sitting
        // inside the narrowed viewport.
        (this.containerEl.parentNode || this.containerEl).appendChild(this.panelEl);
        this.panelListEl = this.panelEl.querySelector('.bp-m3da-panel-list');
        this.panelListEl.addEventListener('click', this.handlePanelClick);

        // Narrow the 3D viewport so the model isn't hidden behind the sidebar.
        // Everything 3D (canvas, pins, drawings, toolbar, gizmo) lives in the
        // wrapper, and pins re-project off the live canvas rect each frame, so
        // shrinking the wrapper + triggering a renderer resize shifts the whole
        // scene left and keeps pins aligned.
        this.applyViewportInset();
    }

    /**
     * Reserve space on the right for the demo sidebar by insetting the 3D
     * wrapper, then tell the renderer to resize so the WebGL canvas re-centers
     * into the remaining area.
     *
     * @private
     * @return {void}
     */
    applyViewportInset() {
        this.containerEl.style.right = `${PANEL_WIDTH}px`;
        this.containerEl.style.width = 'auto';
        if (this.renderer && typeof this.renderer.resize === 'function') {
            // Defer so the layout reflow (new wrapper width) lands before the
            // renderer measures it.
            window.requestAnimationFrame(() => this.renderer.resize());
        }
    }

    /**
     * Undo the viewport inset (on destroy) and resize the renderer back to full
     * width.
     *
     * @private
     * @return {void}
     */
    clearViewportInset() {
        this.containerEl.style.right = '';
        this.containerEl.style.width = '';
        if (this.renderer && typeof this.renderer.resize === 'function') {
            this.renderer.resize();
        }
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

    setDrawingColor(color) {
        this.drawingColor = color;
    }

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

        // Single-key mode shortcuts (ignored while typing / with modifiers):
        //   d — toggle freehand draw mode
        //   b — toggle box3d_comment (annotation pin) placement mode
        if (!event.metaKey && !event.ctrlKey && !event.altKey && !this.isTypingTarget(event.target)) {
            if (event.key === 'd' || event.key === 'D') {
                event.preventDefault();
                this.setDrawMode(!this.isDrawMode);
                return;
            }
            if (event.key === 'b' || event.key === 'B') {
                event.preventDefault();
                this.setPlacementMode(!this.isPlacementMode);
                return;
            }
        }

        if (event.key !== 'Escape') {
            return;
        }

        if (this.isDrawMode) {
            event.stopPropagation();
            this.setDrawMode(false);
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

        // Placement (box-comment) mode: start dragging out a region rectangle.
        // Camera controls stay disabled for the duration of the drag so the box
        // is drawn on a frozen frame (like the region annotation).
        if (this.isPlacementMode && !this.draft) {
            this.renderer.disableCameraControls();
            const boxEl = document.createElement('div');
            boxEl.className = 'bp-m3da-box-draft';
            this.pinsEl.appendChild(boxEl);
            this.boxDrag = { startX: event.clientX, startY: event.clientY, el: boxEl };
            return;
        }

        if (this.isDrawMode && this.drawingDraft) {
            this.isStrokeActive = true;
            this.drawingDraft.currentPath = {
                color: this.drawingColor,
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

        if (this.boxDrag) {
            this.updateBoxDraftEl(event);
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

        if (this.boxDrag) {
            this.finishBoxDrag(event);
            return;
        }

        if (this.isStrokeActive) {
            this.isStrokeActive = false;
            if (this.drawingDraft && this.drawingDraft.currentPath && this.drawingDraft.currentPath.points.length < 2) {
                // A single click with no drag — discard the degenerate stroke.
                this.drawingDraft.paths.pop();
                this.renderDraftStrokes();
            } else {
                // A stroke was drawn — surface the composer so the user can caption
                // it. (Draw mode ends when they send or cancel, not on mouse-up.)
                this.showDrawComposer();
            }
        }
    }

    // -------------------------------------------------------------- region box

    /**
     * Screen-space rect (in canvas percentages) between the box-drag start point
     * and the current pointer, normalized so width/height are positive.
     *
     * @private
     * @param {MouseEvent} event - The current pointer event
     * @return {Object} { xPercent, yPercent, wPercent, hPercent } canvas-relative rect
     */
    getBoxDragRect(event) {
        const { canvas } = this.renderer.box3d;
        const rect = canvas.getBoundingClientRect();
        const x1 = (this.boxDrag.startX - rect.left) / rect.width;
        const y1 = (this.boxDrag.startY - rect.top) / rect.height;
        const x2 = (event.clientX - rect.left) / rect.width;
        const y2 = (event.clientY - rect.top) / rect.height;
        return {
            xPercent: Math.min(x1, x2),
            yPercent: Math.min(y1, y2),
            wPercent: Math.abs(x2 - x1),
            hPercent: Math.abs(y2 - y1),
        };
    }

    /** Position/size the live box-drag preview element to the current pointer. */
    updateBoxDraftEl(event) {
        const { canvas } = this.renderer.box3d;
        const canvasRect = canvas.getBoundingClientRect();
        const rootRect = this.rootEl.getBoundingClientRect();
        const r = this.getBoxDragRect(event);
        const left = r.xPercent * canvasRect.width + (canvasRect.left - rootRect.left);
        const top = r.yPercent * canvasRect.height + (canvasRect.top - rootRect.top);
        this.boxDrag.el.style.left = `${left}px`;
        this.boxDrag.el.style.top = `${top}px`;
        this.boxDrag.el.style.width = `${r.wPercent * canvasRect.width}px`;
        this.boxDrag.el.style.height = `${r.hPercent * canvasRect.height}px`;
    }

    /**
     * Finish a region-box drag: if the box is big enough, raycast its center for
     * the pin anchor and open the composer; otherwise discard it (a stray click).
     *
     * @private
     * @param {MouseEvent} event - The mouse-up event
     * @return {void}
     */
    finishBoxDrag(event) {
        const { startX, startY, el } = this.boxDrag;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        const rect = this.getBoxDragRect(event);

        if (Math.sqrt(dx * dx + dy * dy) <= CLICK_DRAG_THRESHOLD_PX) {
            // Too small to be a box — treat as a mis-click, stay in placement mode.
            this.clearBoxDraft();
            this.renderer.enableCameraControls();
            return;
        }

        // Hand the preview box to the draft so it stays visible while the user
        // types the comment (removed on save/cancel), then stop tracking the drag.
        this.boxDrag = null;

        // Pin at the box's center: raycast the model at that screen point.
        const centerX = startX + dx / 2;
        const centerY = startY + dy / 2;
        const anchor = this.pickAnchorPoint({ clientX: centerX, clientY: centerY });
        const cameraPose = this.captureCameraPose();
        this.openDraft(anchor, rect, cameraPose, el);
    }

    /** Remove the live box-drag preview element (if any) and clear drag state. */
    clearBoxDraft() {
        if (this.boxDrag) {
            if (this.boxDrag.el && this.boxDrag.el.parentNode) {
                this.boxDrag.el.remove();
            }
            this.boxDrag = null;
        }
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

    // ------------------------------------------------------- shared composer

    /**
     * Build a comment composer element that matches the real Box comment field: a
     * borderless rounded white pill with the "Add a comment, @ to mention"
     * placeholder and a circular send arrow that enables once there's text. Wires
     * up input/send/Enter/Escape and focuses the input. Send requires non-empty
     * text (per demo spec — every drawing/box annotation must carry a comment).
     *
     * @private
     * @param {Object} opts
     * @param {boolean} [opts.fixed] - Pin the composer to the viewer's bottom-center (draw mode)
     * @param {Function} opts.onSend - Called with the trimmed message when the user sends
     * @param {Function} opts.onCancel - Called when the user presses Escape
     * @return {HTMLElement} The composer popup element (already appended to pinsEl)
     */
    createComposerEl({ fixed = false, onSend, onCancel }) {
        const popupEl = document.createElement('div');
        popupEl.className = `bp-m3da-popup${fixed ? ' bp-m3da-popup-fixed' : ''}`;
        popupEl.innerHTML = `
            <div class="bp-m3da-composer">
                <textarea class="bp-m3da-composer-input" placeholder="Add a comment, @ to mention" rows="1"></textarea>
                <button type="button" class="bp-m3da-composer-send" title="Comment" disabled>
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path fill="currentColor" d="M12 4a1 1 0 0 1 .7.29l5 5a1 1 0 0 1-1.4 1.42L13 7.4V19a1 1 0 1 1-2 0V7.41L7.7 10.7a1 1 0 1 1-1.4-1.42l5-5A1 1 0 0 1 12 4Z"/>
                    </svg>
                </button>
            </div>`;
        this.pinsEl.appendChild(popupEl);

        const inputEl = popupEl.querySelector('.bp-m3da-composer-input');
        const sendEl = popupEl.querySelector('.bp-m3da-composer-send');
        const syncSendState = () => {
            sendEl.disabled = inputEl.value.trim().length === 0;
        };
        const send = () => {
            if (inputEl.value.trim().length > 0) {
                onSend(inputEl.value);
            }
        };

        sendEl.addEventListener('click', send);
        inputEl.addEventListener('input', syncSendState);
        inputEl.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onCancel();
                return;
            }
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
            }
        });
        syncSendState();
        inputEl.focus();

        return popupEl;
    }

    // ---------------------------------------------------------- comment draft

    /**
     * Open a comment draft for a placed region box. `anchor` is the world-space
     * pin point (the box's center), `boxRect` is the screen-space rectangle in
     * canvas percentages, `cameraPose` is the frozen viewpoint. Camera controls
     * are already disabled by the box-drag flow.
     *
     * @private
     * @param {Object} anchor - World-space point { x, y, z } for the pin
     * @param {Object} boxRect - Screen-space rect { xPercent, yPercent, wPercent, hPercent }
     * @param {Object} cameraPose - Captured camera pose
     * @param {HTMLElement} [boxEl] - The live preview box element, kept visible while typing
     * @return {void}
     */
    openDraft(anchor, boxRect, cameraPose, boxEl = null) {
        const pinEl = this.createPinEl('+', true);
        const popupEl = this.createComposerEl({
            onSend: message => this.saveDraft(message),
            onCancel: () => this.setPlacementMode(false),
        });

        this.draft = { anchor, boxRect, cameraPose, pinEl, popupEl, boxEl };
    }

    cancelDraft() {
        if (!this.draft) {
            return;
        }

        this.draft.pinEl.remove();
        this.draft.popupEl.remove();
        if (this.draft.boxEl && this.draft.boxEl.parentNode) {
            this.draft.boxEl.remove();
        }
        this.draft = null;
        this.clearBoxDraft();
        this.renderer.enableCameraControls();
    }

    saveDraft(message) {
        const trimmed = (message || '').trim();
        if (!this.draft || !trimmed) {
            return;
        }

        const { anchor, boxRect, cameraPose } = this.draft;
        const annotation = {
            id: `demo_${Date.now()}_${this.annotations.length}`,
            type: 'comment',
            message: trimmed,
            createdAt: new Date().toISOString(),
            createdBy: { ...DEMO_USER },
            // DEMO: stamp the model version this comment was created on so a later
            // "navigate to resolved comment" can diff created→resolved versions.
            createdVersion: DEFAULT_CREATED_VERSION,
            target: {
                type: 'model3d',
                location: { type: 'model3d', value: 1 },
                point: anchor,
                // Screen-space region rectangle (pose-gated, like a drawing). The
                // pin sits at its center; the box only renders from the saved pose.
                box: boxRect,
                camera: cameraPose,
            },
        };

        // Post a REAL comment to the Box Comments API so it shows up in the
        // Activity tab (and persists server-side). The camera pose + anchor
        // still live in localStorage so the pin/fly-back demo keeps working.
        // Capture the returned comment id so we can later correlate the pin
        // with its Activity-feed resolution state (see pollResolved()).
        this.postComment(trimmed).then(commentId => {
            if (commentId) {
                annotation.commentId = commentId;
                fakeAnnotationsApi.update(this.fileId, annotation.id, { commentId });
            }
        });

        fakeAnnotationsApi.create(this.fileId, annotation).then(() => {
            this.annotations.push(annotation);
            this.addAnnotationEl(annotation);
            this.setPlacementMode(false);
            this.flashPin(annotation.id);
            // Add the new comment's card (with its blue chip) to the demo panel.
            this.renderPanel();
        });
    }

    /**
     * Post a real comment on the file so it shows up in the Activity feed.
     * Because 3D files have no native annotator, we surface the comment as a
     * plain file comment.
     *
     * IMPORTANT: we post to the LEGACY `POST /2.0/comments` endpoint. The
     * threaded store (`POST /2.0/undoc/comments?file_id=:id`) rejects
     * Preview's downscoped file token with a 400 — undoc/ routes are
     * monolith-internal and only accept full webapp-session auth. Legacy
     * accepts the Preview token, so the demo requires the Activity feed to
     * run in legacy read mode: UAA off AND both threaded-replies splits off
     * (ff_preview_sidebar_uaa_integration=no, ff_preview_threaded_replies_q1fy24=no,
     * ff_threaded_replies_preview=no), which makes Feed.js fall back to
     * `GET /2.0/files/:id/comments`. Best-effort: failures are logged, not
     * blocking (the demo pin still saves locally).
     *
     * @param {string} message - Comment body (already trimmed)
     * @return {Promise<string|undefined>} Resolves with the created comment's id (or undefined)
     */
    postComment(message) {
        if (!this.api || !this.apiHost || !this.fileId) {
            return Promise.resolve();
        }

        const url = `${this.apiHost}/2.0/comments`;
        const headers = getHeaders(
            { 'Content-Type': 'application/json' },
            this.token,
            this.sharedLink,
            this.sharedLinkPassword,
        );
        const data = {
            item: { type: 'file', id: String(this.fileId) },
            message,
        };

        return this.api
            .post(url, data, { headers })
            .then(response => (response && response.id ? String(response.id) : undefined))
            .catch(err => {
                console.warn('[model3d-annotations] failed to post comment to Activity feed', err); // eslint-disable-line no-console
                return undefined;
            });
    }

    /**
     * Read the file's comments and hide any pin whose comment was marked resolved
     * in the Activity sidebar. There's no push channel from the sidebar into
     * Preview, so we poll (see startResolvedPolling). The legacy
     * `GET /2.0/files/:id/comments` returns `is_resolved` per comment when the
     * feed is in legacy read mode (the same mode postComment() requires).
     *
     * @return {Promise} Resolves when the sync completes (or immediately if no api)
     */
    syncResolvedFromActivity() {
        if (!this.api || !this.apiHost || !this.fileId) {
            return Promise.resolve();
        }

        const url = `${this.apiHost}/2.0/files/${this.fileId}/comments?fields=is_resolved`;
        const headers = getHeaders({}, this.token, this.sharedLink, this.sharedLinkPassword);

        return this.api
            .get(url, { headers })
            .then(response => {
                const resolvedIds = new Set(
                    ((response && response.entries) || [])
                        .filter(comment => comment.is_resolved)
                        .map(comment => String(comment.id)),
                );

                this.annotations.forEach(annotation => {
                    const isResolved = annotation.commentId && resolvedIds.has(String(annotation.commentId));
                    if (isResolved && !annotation.resolved) {
                        annotation.resolved = true;
                        // DEMO: stamp the version the comment was resolved on so
                        // navigating to it opens a created→resolved diff.
                        annotation.resolvedVersion = annotation.resolvedVersion || DEFAULT_RESOLVED_VERSION;
                        fakeAnnotationsApi.update(this.fileId, annotation.id, {
                            resolved: true,
                            resolvedVersion: annotation.resolvedVersion,
                        });
                        this.applyResolvedVisibility(annotation);
                        // Flip its chip label from the xyz anchor to "v1 ↔ v2".
                        this.renderPanel();
                    }
                });
            })
            .catch(err => {
                console.warn('[model3d-annotations] failed to sync resolved state', err); // eslint-disable-line no-console
            });
    }

    startResolvedPolling() {
        this.syncResolvedFromActivity();
        this.resolvedPollId = window.setInterval(() => this.syncResolvedFromActivity(), RESOLVED_POLL_MS);
    }

    /** Remove a resolved annotation's pin so it no longer shows on the model. */
    applyResolvedVisibility(annotation) {
        if (annotation.type === 'drawing') {
            this.renderVisibleDrawings();
            return;
        }
        const pinEl = this.pinsEl && this.pinsEl.querySelector(`[data-annotation-id="${annotation.id}"]`);
        if (pinEl) {
            pinEl.remove();
        }
    }

    // ---------------------------------------------------------- draw draft

    renderDraftStrokes() {
        if (!this.drawingDraft) {
            return;
        }
        this.renderMarksIntoSvg(this.drawingsSvgEl, this.drawingDraft.paths, [], 'bp-m3da-draft-stroke');
    }

    /**
     * Show the shared comment composer (pinned bottom-center) so the user can
     * caption the freehand drawing they just drew. Sending saves the drawing with
     * its comment; Escape cancels the whole draw. Re-shown idempotently if a
     * further stroke is added.
     *
     * @private
     * @return {void}
     */
    showDrawComposer() {
        if (this.drawComposerEl || !this.drawingDraft) {
            return;
        }
        this.drawComposerEl = this.createComposerEl({
            fixed: true,
            onSend: message => this.finishDrawing(message),
            onCancel: () => this.setDrawMode(false),
        });
    }

    /** Remove the draw-mode caption composer (if shown). */
    cancelDrawComposer() {
        if (this.drawComposerEl) {
            this.drawComposerEl.remove();
            this.drawComposerEl = null;
        }
    }

    /**
     * Save the active freehand drawing with the given comment. Requires both a
     * valid stroke and non-empty text (per demo spec). Called from the draw-mode
     * composer's send.
     *
     * @private
     * @param {string} message - The comment body captioning the drawing
     * @return {void}
     */
    finishDrawing(message) {
        const trimmed = (message || '').trim();
        if (!this.drawingDraft || !trimmed) {
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
            message: trimmed,
            createdAt: new Date().toISOString(),
            createdBy: { ...DEMO_USER },
            createdVersion: DEFAULT_CREATED_VERSION,
            target: {
                type: 'model3d',
                location: { type: 'model3d', value: 1 },
                camera: cameraPose,
                drawing: { paths: validPaths },
            },
        };

        // Post a real comment so the drawing shows up in the Activity feed too.
        this.postComment(trimmed).then(commentId => {
            if (commentId) {
                annotation.commentId = commentId;
                fakeAnnotationsApi.update(this.fileId, annotation.id, { commentId });
            }
        });

        fakeAnnotationsApi.create(this.fileId, annotation).then(() => {
            this.annotations.push(annotation);
            this.addAnnotationEl(annotation);
            this.setDrawMode(false);
            this.renderPanel();
        });
    }

    cancelDrawingDraft() {
        if (!this.drawingDraft) {
            return;
        }

        this.cancelDrawComposer();
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
        // Resolved annotations are hidden from the model (still visible/reopenable
        // in the Activity feed).
        if (annotation.resolved) {
            return;
        }
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
        // Unresolved pins are numbered by their position among unresolved
        // comments. A focused resolved pin isn't in that set, so it falls back to
        // its index among ALL comments for a stable, meaningful label.
        const unresolved = this.annotations.filter(a => a.type !== 'drawing' && !a.resolved);
        const allComments = this.annotations.filter(a => a.type !== 'drawing');
        const baseIndex = unresolved.indexOf(annotation);
        const label = String((baseIndex === -1 ? allComments.indexOf(annotation) : baseIndex) + 1);
        const pinEl = this.createPinEl(label);
        pinEl.dataset.annotationId = annotation.id;
        pinEl.classList.toggle('bp-m3da-pin-resolved', !!annotation.resolved);

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
        });

        if (this.draft) {
            positionEl(this.draft.pinEl, this.draft.anchor);
            // Place the composer BELOW the region box (not on top of the pin), so
            // it doesn't cover what was just annotated. Centered on the box's
            // horizontal midpoint, just under its bottom edge.
            const { boxRect } = this.draft;
            if (boxRect) {
                const centerX =
                    (boxRect.xPercent + boxRect.wPercent / 2) * canvasRect.width + (canvasRect.left - rootRect.left);
                const bottomY =
                    (boxRect.yPercent + boxRect.hPercent) * canvasRect.height + (canvasRect.top - rootRect.top);
                this.draft.popupEl.classList.remove('bp-is-hidden');
                this.draft.popupEl.style.transform = `translate(-50%, 0) translate(${centerX}px, ${bottomY + 12}px)`;
            } else {
                positionEl(this.draft.popupEl, this.draft.anchor, 10);
            }
        }

        if (!this.isDrawMode) {
            this.renderVisibleDrawings();
        }
    }

    /**
     * Render every saved drawing AND region box whose pose matches the live
     * camera; clear the rest. Both are screen-space (pose-gated) marks, so they
     * share the one SVG overlay.
     */
    renderVisibleDrawings() {
        if (!this.drawingsSvgEl) {
            return;
        }

        const visiblePaths = this.annotations
            .filter(a => a.type === 'drawing' && this.isAnnotationVisible(a) && this.isPoseNearCamera(a.target.camera))
            .flatMap(a => a.target.drawing.paths);

        const visibleBoxes = this.annotations
            .filter(
                a =>
                    a.type === 'comment' &&
                    a.target &&
                    a.target.box &&
                    this.isAnnotationVisible(a) &&
                    this.isPoseNearCamera(a.target.camera),
            )
            .map(a => a.target.box);

        this.renderMarksIntoSvg(this.drawingsSvgEl, visiblePaths, visibleBoxes, 'bp-m3da-stroke');
    }

    /**
     * Render strokes (polylines) and region boxes (rounded rects) into the SVG,
     * replacing prior content. Rects use canvas-percentage geometry so they track
     * viewport resizes; strokes use the same percentage-of-viewport model.
     *
     * @private
     * @param {SVGElement} svgEl - The overlay SVG
     * @param {Object[]} paths - [{ points: [{xPercent,yPercent}], color }]
     * @param {Object[]} boxes - [{ xPercent, yPercent, wPercent, hPercent }]
     * @param {string} className - CSS class for the stroke polylines
     * @return {void}
     */
    renderMarksIntoSvg(svgEl, paths, boxes, className) {
        const rect = svgEl.getBoundingClientRect();
        svgEl.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);

        const strokeMarkup = paths
            .map(path => {
                const pointsAttr = path.points
                    .map(p => `${(p.xPercent * rect.width).toFixed(1)},${(p.yPercent * rect.height).toFixed(1)}`)
                    .join(' ');
                return `<polyline class="${className}" points="${pointsAttr}" stroke="${path.color}" stroke-width="${DRAWING_STROKE_WIDTH}" fill="none" />`;
            })
            .join('');

        const boxMarkup = (boxes || [])
            .map(box => {
                const x = (box.xPercent * rect.width).toFixed(1);
                const y = (box.yPercent * rect.height).toFixed(1);
                const w = (box.wPercent * rect.width).toFixed(1);
                const h = (box.hPercent * rect.height).toFixed(1);
                return `<rect class="bp-m3da-box" x="${x}" y="${y}" width="${w}" height="${h}" rx="10" ry="10" />`;
            })
            .join('');

        svgEl.innerHTML = strokeMarkup + boxMarkup;
    }

    // ---------------------------------------------------------------- focus

    focusAnnotation(annotation) {
        // Clicking any live pin clears a resolved-comment focus (we're navigating
        // to a different comment).
        this.clearResolvedFocus();

        // The comment text lives in the demo Activity panel now, not on the model
        // — clicking a pin just flies the camera back to the saved viewpoint.
        this.applyCameraPose(annotation.target.camera);
        this.flashPin(annotation.id);
    }

    // ------------------------------------------------------- activity panel

    /**
     * The label shown on a comment's blue chip. Because 3D comments have no page
     * number, we surface the annotation's saved location instead:
     *   - resolved  → "v1 ↔ v2" (the versions it was created-on and resolved-on)
     *   - otherwise → "(x: 12, y: 234, z: 123)" from the world-space anchor point
     *
     * @private
     * @param {Object} annotation - The annotation backing the comment card
     * @return {string} Chip label
     */
    getChipLabel(annotation) {
        if (annotation.resolved) {
            const created = annotation.createdVersion || DEFAULT_CREATED_VERSION;
            const resolved = annotation.resolvedVersion || DEFAULT_RESOLVED_VERSION;
            return `${created} ↔ ${resolved}`;
        }
        const point = annotation.target && annotation.target.point;
        if (!point) {
            return '3D location';
        }
        // Models are typically normalized to unit scale, so anchor coordinates
        // are small fractions (e.g. 0.34, -0.12). Math.round would collapse every
        // one to 0, so use adaptive precision: 2 decimals for |n| < 10, whole
        // numbers for larger world-space coordinates.
        const fmt = n => {
            const v = Number(n) || 0;
            return Math.abs(v) < 10 ? Number(v.toFixed(2)) : Math.round(v);
        };
        return `(x: ${fmt(point.x)}, y: ${fmt(point.y)}, z: ${fmt(point.z)})`;
    }

    /**
     * Escape a string for safe insertion into the panel's innerHTML.
     *
     * @private
     * @param {string} str - Raw text
     * @return {string} HTML-escaped text
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    /**
     * Render (from scratch) the demo Activity panel — one card per comment
     * annotation, each with the blue xyz / "v1 ↔ v2" chip. The real
     * box-ui-elements sidebar renders in a browsing context Preview can't reach,
     * so this panel is the demo's fully-controlled stand-in.
     *
     * @private
     * @return {void}
     */
    renderPanel() {
        if (!this.panelListEl) {
            return;
        }

        const comments = this.annotations.filter(a => a.type !== 'drawing');
        if (!comments.length) {
            this.panelListEl.innerHTML = '<div class="bp-m3da-panel-empty">No comments yet</div>';
            return;
        }

        this.panelListEl.innerHTML = comments
            .map(annotation => {
                const initials = this.escapeHtml((annotation.createdBy && annotation.createdBy.initials) || '?');
                const name = this.escapeHtml((annotation.createdBy && annotation.createdBy.name) || 'Someone');
                const message = this.escapeHtml(annotation.message || '');
                const chipLabel = this.escapeHtml(this.getChipLabel(annotation));
                const time = this.escapeHtml(this.formatRelativeTime(annotation.createdAt));
                const resolvedClass = annotation.resolved ? ' bp-m3da-card-resolved' : '';
                const focusedClass = annotation.id === this.resolvedFocusId ? ' bp-m3da-card-focused' : '';
                return `
                    <div class="bp-m3da-card${resolvedClass}${focusedClass}" data-annotation-id="${annotation.id}" role="button" tabindex="0">
                        <div class="bp-m3da-card-head">
                            <span class="bp-m3da-avatar">${initials}</span>
                            <span class="bp-m3da-card-name">${name}</span>
                        </div>
                        <button type="button" class="bp-m3da-chip" data-annotation-id="${annotation.id}">${chipLabel}</button>
                        <div class="bp-m3da-card-message">${message}</div>
                        <div class="bp-m3da-card-time">${time}</div>
                    </div>`;
            })
            .join('');
    }

    /**
     * Format an ISO timestamp as a Box-style relative time ("3 minutes ago").
     *
     * @private
     * @param {string} iso - ISO 8601 timestamp
     * @return {string} Relative time label
     */
    formatRelativeTime(iso) {
        if (!iso) {
            return '';
        }
        const then = new Date(iso).getTime();
        if (Number.isNaN(then)) {
            return '';
        }
        const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
        if (seconds < 60) {
            return seconds <= 1 ? 'Just now' : `${seconds} seconds ago`;
        }
        const minutes = Math.round(seconds / 60);
        if (minutes < 60) {
            return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
        }
        const hours = Math.round(minutes / 60);
        if (hours < 24) {
            return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
        }
        const days = Math.round(hours / 24);
        return days === 1 ? '1 day ago' : `${days} days ago`;
    }

    /**
     * Click handler for the demo Activity panel (delegated). A click anywhere on a
     * card — or its blue chip — navigates to that annotation.
     *
     * @private
     * @param {MouseEvent} event - The panel click
     * @return {void}
     */
    handlePanelClick(event) {
        const card = event.target && event.target.closest && event.target.closest('[data-annotation-id]');
        if (!card) {
            return;
        }
        event.preventDefault();
        this.navigateToAnnotation(card.dataset.annotationId);
    }

    /**
     * Navigate to an annotation from the panel: fly the camera to its saved pose.
     * If the comment is resolved, also open the version diff on its
     * created→resolved pair (reuses the resolved-focus path). Unresolved comments
     * just fly.
     *
     * @private
     * @param {string} annotationId - Id of the annotation to navigate to
     * @return {void}
     */
    navigateToAnnotation(annotationId) {
        const annotation = this.annotations.find(a => a.id === annotationId);
        if (!annotation || !annotation.target || !annotation.target.camera) {
            return;
        }

        if (annotation.resolved) {
            if (annotation.id !== this.resolvedFocusId) {
                this.focusResolvedComment(annotation);
            }
            return;
        }

        // Unresolved: clear any resolved focus/diff, then fly to the saved pose.
        if (this.resolvedFocusId) {
            this.clearResolvedFocus();
        }
        this.applyCameraPose(annotation.target.camera);
        this.flashPin(annotation.id);
        this.renderPanel();
    }

    // -------------------------------------------------- resolved-comment focus

    /**
     * Navigate to a resolved comment: open the version diff on the versions the
     * comment was created on vs. resolved on, fly the camera to its saved pose,
     * and reveal ONLY this pin (all other pins/drawings stay hidden). The pin
     * persists while the user toggles between the two versions.
     *
     * @param {Object} annotation - A resolved comment annotation
     * @return {void}
     */
    focusResolvedComment(annotation) {
        if (!annotation || annotation.type === 'drawing') {
            return;
        }

        this.resolvedFocusId = annotation.id;

        // Ask the viewer to open the diff on this comment's version pair.
        this.onResolvedFocus(
            annotation.createdVersion || DEFAULT_CREATED_VERSION,
            annotation.resolvedVersion || DEFAULT_RESOLVED_VERSION,
        );

        this.refreshPinVisibility();
        this.applyCameraPose(annotation.target.camera);
        this.flashPin(annotation.id);
        this.renderPanel();
    }

    /**
     * End a resolved-comment focus: hide its pin again and tell the viewer the
     * focus is over (it may exit the diff view). No-op if nothing is focused.
     *
     * @return {void}
     */
    clearResolvedFocus() {
        if (!this.resolvedFocusId) {
            return;
        }
        this.resolvedFocusId = null;
        this.refreshPinVisibility();
        this.onResolvedBlur();
        this.renderPanel();
    }

    /**
     * Whether a pin/drawing should be visible right now. While a resolved comment
     * is focused, ONLY that annotation shows. Otherwise, resolved annotations are
     * hidden and everything else shows.
     *
     * @private
     * @param {Object} annotation - The annotation to test
     * @return {boolean} True if it should render
     */
    isAnnotationVisible(annotation) {
        if (this.resolvedFocusId) {
            return annotation.id === this.resolvedFocusId;
        }
        return !annotation.resolved;
    }

    /**
     * Rebuild comment pins from scratch to match current visibility (used when a
     * resolved-comment focus starts or ends). Drawings are pose-gated in
     * renderVisibleDrawings(), so we just re-run that.
     *
     * @private
     * @return {void}
     */
    refreshPinVisibility() {
        if (!this.pinsEl) {
            return;
        }
        // Drop every existing comment pin, then re-add the visible ones so pin
        // numbering stays consistent with addPinEl()'s filter.
        this.pinsEl.querySelectorAll('.bp-m3da-pin:not(.bp-m3da-pin-draft)').forEach(el => el.remove());
        this.annotations
            .filter(a => a.type !== 'drawing' && this.isAnnotationVisible(a))
            .forEach(a => this.addPinEl(a));
        this.renderVisibleDrawings();
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
}

export default Model3DAnnotationsDemo;
