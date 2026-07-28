/* global THREE */
import './Model3DVersionDiff.scss';

// DEMO ONLY — 3D version-diffing overlay for the Model3D viewer.
//
// This is the "visual / render diff" idiom (as opposed to a geometric deviation
// heatmap or a parametric feature-tree diff): two versions of a model are drawn
// through the SAME camera, and you compare them by blink-toggling, cross-fading
// opacity, and overlaying (onion-skin / ghosting).
//
// Because Box3D uses a single camera and the live scene is a plain THREE.Scene
// (renderer.getScene().runtimeData), anything we add renders through that one
// camera by construction — the "same camera angle" requirement is free, and the
// versions share one coordinate frame so they're perfectly aligned.
//
// Since the backend serves no real second version here (this is a client-side
// spike, like the annotations + thumbnail demos), we synthesize the versions
// from the live model geometry with a SUBTLE, RIGID change to the top region of
// the model (the turret, on a tank) so the delta reads as a real revision, not
// a blob morph: v2 rotates the turret about the vertical axis; v3 resizes it.
// The change is weighted by a smoothstep band so the turret moves as a unit
// while its base stays welded to the hull (no tearing). Each version is tinted
// a distinct color so it's obvious which layer is which as they cross-fade.

const VERSIONS = [
    { color: 0x9aa5b1, id: 'v1', label: 'Version 1 — original', transform: null },
    { color: 0x0061d5, id: 'v2', label: 'Version 2 — turret rotated', rotateDeg: 14, transform: 'rotate' },
    { color: 0xf5a623, id: 'v3', label: 'Version 3 — gun resized', scaleFactor: 1.18, transform: 'scale' },
];

const DEFAULT_BOTTOM = 'v1';
const DEFAULT_TOP = 'v2';
const MAX_MESH_RETRIES = 30;

// The top REGION_TOP_FRACTION of the model's height is treated as the movable
// "turret"; the smoothstep weld band spans from REGION_BLEND_FROM up to the top,
// so vertices near the hull barely move and vertices at the top move fully.
const REGION_TOP_FRACTION = 0.55;
const REGION_BLEND_FROM = 0.35;

class Model3DVersionDiff {
    /** @property {HTMLElement} - Viewer wrapper the control bar is appended to */
    containerEl;

    /** @property {Model3DRenderer} - Renderer giving access to the live scene + camera */
    renderer;

    /** @property {THREE.BufferGeometry[]} - Source geometries baked into world space */
    baseGeometries;

    /** @property {Object.<string, THREE.Group>} - Built version groups keyed by version id */
    versionGroups;

    /** @property {THREE.Object3D[]} - The live model meshes we hide while diffing */
    hiddenSourceMeshes;

    /**
     * @param {Object} config - Configuration
     * @param {HTMLElement} config.containerEl - Element to append the control bar to (viewer wrapper)
     * @param {Model3DRenderer} config.renderer - The model renderer
     */
    constructor({ containerEl, renderer }) {
        this.containerEl = containerEl;
        this.renderer = renderer;

        this.baseGeometries = [];
        this.versionGroups = {};
        this.hiddenSourceMeshes = [];

        this.bottomId = DEFAULT_BOTTOM;
        this.topId = DEFAULT_TOP;
        this.opacity = 0.5;

        this.handleBottomChange = this.handleBottomChange.bind(this);
        this.handleTopChange = this.handleTopChange.bind(this);
        this.handleOpacityInput = this.handleOpacityInput.bind(this);
        this.handleBlink = this.handleBlink.bind(this);
        this.tryBuild = this.tryBuild.bind(this);
    }

    /**
     * Build the (initially hidden) control bar. Geometry layers are built lazily
     * the first time diffing is enabled, so an untouched viewer just shows the
     * plain original model.
     *
     * @return {void}
     */
    init() {
        if (!this.getSceneRoot()) {
            return;
        }

        this.enabled = false;
        this.built = false;
        this.buildDom();
        this.updateBarVisibility();

        window.__model3dVersionDiff = this;
    }

    /**
     * Turn version-diffing on or off. When on, the original model is hidden and
     * the tinted version layers are shown; when off, the layers are hidden and
     * the original model is restored, so the viewer looks untouched.
     *
     * @param {boolean} enabled - Whether diffing should be active
     * @return {void}
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.updateBarVisibility();

        if (!this.getSceneRoot()) {
            return;
        }

        if (enabled) {
            if (!this.built) {
                this.retries = 0;
                this.tryBuild();
            } else {
                this.hideSourceMeshes();
                this.applyState();
            }
        } else {
            this.hideVersionGroups();
            this.restoreSourceMeshes();
            this.forceRender();
        }
    }

    /**
     * Show the control bar only while diffing is enabled.
     *
     * @private
     * @return {void}
     */
    updateBarVisibility() {
        if (this.barEl) {
            this.barEl.classList.toggle('bp-is-hidden', !this.enabled);
        }
    }

    /**
     * Tear down the overlay, restore the original model, and dispose resources.
     *
     * @return {void}
     */
    destroy() {
        window.cancelAnimationFrame(this.rafId);

        const scene = this.getSceneRoot();
        Object.keys(this.versionGroups).forEach(id => {
            const group = this.versionGroups[id];
            if (scene) {
                scene.remove(group);
            }
            group.traverse(obj => {
                if (obj.isMesh) {
                    if (obj.geometry) {
                        obj.geometry.dispose();
                    }
                    if (obj.material) {
                        obj.material.dispose();
                    }
                }
            });
        });
        this.versionGroups = {};

        this.baseGeometries.forEach(geo => geo.dispose());
        this.baseGeometries = [];

        // Restore the live model we hid.
        this.restoreSourceMeshes();
        this.hiddenSourceMeshes = [];

        this.forceRender();

        if (this.barEl && this.barEl.parentNode) {
            this.barEl.parentNode.removeChild(this.barEl);
        }
        this.barEl = null;

        if (window.__model3dVersionDiff === this) {
            delete window.__model3dVersionDiff;
        }
    }

    // ------------------------------------------------------------------ scene

    /**
     * The live THREE.Scene managed by the Box3D runtime.
     *
     * @private
     * @return {THREE.Scene|undefined} The scene root, or undefined if not ready
     */
    getSceneRoot() {
        const scene = this.renderer && this.renderer.getScene && this.renderer.getScene();
        return scene ? scene.runtimeData : undefined;
    }

    /**
     * Flag the Box3D runtime to render a fresh frame (it renders on demand).
     *
     * @private
     * @return {void}
     */
    forceRender() {
        if (this.renderer && this.renderer.box3d) {
            this.renderer.box3d.needsRender = true;
        }
    }

    /**
     * Collect the live model meshes in the scene (excluding our own layers and
     * the grid/axis helpers, which are line primitives, not meshes).
     *
     * @private
     * @return {THREE.Mesh[]} Source meshes
     */
    collectSourceMeshes() {
        const scene = this.getSceneRoot();
        const meshes = [];
        if (!scene) {
            return meshes;
        }
        scene.traverse(obj => {
            if (obj.isMesh && obj.geometry && !obj.userData.__versionDiff) {
                meshes.push(obj);
            }
        });
        return meshes;
    }

    /**
     * Wait for the model geometry to exist, then build the version layers.
     * The Box3D remote instance can finish loading geometry a frame or two after
     * the scene 'load' event, so we retry a bounded number of times.
     *
     * @private
     * @return {void}
     */
    tryBuild() {
        if (!this.enabled) {
            return;
        }

        const sourceMeshes = this.collectSourceMeshes();
        if (!sourceMeshes.length) {
            this.retries += 1;
            if (this.retries <= MAX_MESH_RETRIES) {
                this.rafId = window.requestAnimationFrame(this.tryBuild);
            }
            return;
        }

        this.buildBaseGeometries(sourceMeshes);
        this.built = true;
        this.applyState();

        if (this.barEl) {
            this.barEl.classList.remove('bp-m3dvd-loading');
        }
    }

    /**
     * Hide the live model meshes so only our version layers show.
     *
     * @private
     * @return {void}
     */
    hideSourceMeshes() {
        this.hiddenSourceMeshes.forEach(mesh => {
            mesh.visible = false;
        });
    }

    /**
     * Restore the live model meshes we hid while diffing.
     *
     * @private
     * @return {void}
     */
    restoreSourceMeshes() {
        this.hiddenSourceMeshes.forEach(mesh => {
            mesh.visible = true;
        });
    }

    /**
     * Hide every built version group.
     *
     * @private
     * @return {void}
     */
    hideVersionGroups() {
        Object.keys(this.versionGroups).forEach(id => {
            this.versionGroups[id].visible = false;
        });
    }

    /**
     * Clone each source mesh's geometry into world space so every version shares
     * one coordinate frame and can sit at the scene root with an identity
     * transform. Also hide the original meshes so only our layers show.
     *
     * @private
     * @param {THREE.Mesh[]} sourceMeshes - The live model meshes
     * @return {void}
     */
    buildBaseGeometries(sourceMeshes) {
        const scene = this.getSceneRoot();
        scene.updateMatrixWorld(true);

        this.baseGeometries = sourceMeshes.map(mesh => {
            mesh.updateMatrixWorld(true);
            const geo = mesh.geometry.clone();
            const bakeMatrix = geo.applyMatrix4 ? 'applyMatrix4' : 'applyMatrix';
            geo[bakeMatrix](mesh.matrixWorld);
            if (geo.computeVertexNormals) {
                geo.computeVertexNormals();
            }
            return geo;
        });

        // Overall bounds across all base geometries → drives deform placement/scale.
        const box = new THREE.Box3();
        this.baseGeometries.forEach(geo => {
            if (geo.computeBoundingBox) {
                geo.computeBoundingBox();
            }
            if (geo.boundingBox) {
                box.union(geo.boundingBox);
            }
        });
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        // Detect the "up" axis as the shortest bounding-box dimension. A tank
        // (and most vehicles) is far flatter than it is long/wide, so its height
        // axis is the smallest extent, and the turret sits at the top (max) end
        // of that axis. This is robust to however Box3D normalized the model's
        // orientation in world space.
        const dims = [size.x, size.y, size.z];
        const upAxis = dims.indexOf(Math.min(...dims));
        const horizAxes = [0, 1, 2].filter(a => a !== upAxis);

        this.bounds = {
            box,
            center,
            horizAxes,
            maxDim: Math.max(size.x, size.y, size.z) || 1,
            size,
            upAxis,
        };

        // Hide the live model; our layers replace it while diffing.
        this.hiddenSourceMeshes = sourceMeshes;
        this.hideSourceMeshes();
    }

    /**
     * Get (building + caching on first use) the group of meshes for a version.
     *
     * @private
     * @param {string} versionId - The version id
     * @return {THREE.Group} The version's group of meshes
     */
    getVersionGroup(versionId) {
        if (this.versionGroups[versionId]) {
            return this.versionGroups[versionId];
        }

        const version = VERSIONS.find(v => v.id === versionId) || VERSIONS[0];
        const group = new THREE.Group();
        group.userData.__versionDiff = true;

        this.baseGeometries.forEach(base => {
            const geo = base.clone();
            if (version.transform) {
                this.applyTransform(geo, version);
            }
            const material = new THREE.MeshPhongMaterial({
                color: version.color,
                emissive: new THREE.Color(version.color).multiplyScalar(0.15),
                shininess: 18,
                specular: 0x111111,
                transparent: true,
                opacity: 1,
            });
            const mesh = new THREE.Mesh(geo, material);
            mesh.userData.__versionDiff = true;
            group.add(mesh);
        });

        this.getSceneRoot().add(group);
        this.versionGroups[versionId] = group;
        return group;
    }

    /**
     * Apply a subtle RIGID transform to the top region of the model so a version
     * reads as a real revision (turret rotated, or gun/turret resized) rather
     * than a blob morph. Each vertex is weighted by a smoothstep of its height:
     * ~0 at/below the blend band (welded to the hull) up to 1 at the top, so the
     * turret moves as a unit while its base stays attached. The transform is
     * applied about a pivot at the horizontal center, at the blend-band height,
     * so rotation/scale pivots around where the turret meets the hull.
     *
     * @private
     * @param {THREE.BufferGeometry} geo - Geometry to transform (mutated in place)
     * @param {Object} version - Version descriptor with { transform, rotateDeg | scaleFactor }
     * @return {void}
     */
    applyTransform(geo, version) {
        const { box, center, size, upAxis, horizAxes } = this.bounds;
        const AXES = ['x', 'y', 'z'];
        const up = AXES[upAxis];
        const h0 = AXES[horizAxes[0]];
        const h1 = AXES[horizAxes[1]];

        const upMin = box.min[up];
        const upSpan = size[up] || 1;
        const blendLo = upMin + REGION_BLEND_FROM * upSpan;
        const blendHi = upMin + REGION_TOP_FRACTION * upSpan;

        // Pivot: horizontal center of the model, at the base of the turret.
        const pivot = { [h0]: center[h0], [h1]: center[h1], [up]: blendLo };

        const position = geo.attributes && geo.attributes.position;
        if (!position) {
            return;
        }

        const angle = version.transform === 'rotate' ? (version.rotateDeg * Math.PI) / 180 : 0;
        const scale = version.transform === 'scale' ? version.scaleFactor : 1;

        const v = new THREE.Vector3();
        for (let i = 0; i < position.count; i += 1) {
            v.set(position.getX(i), position.getY(i), position.getZ(i));

            const hval = v[up];
            let w = (hval - blendLo) / (blendHi - blendLo);
            w = Math.max(0, Math.min(1, w));
            w = w * w * (3 - 2 * w); // smoothstep weld band

            // w === 0 → vertex is at/below the weld band, leave it untouched.
            if (w > 0) {
                // Offset from pivot in the horizontal plane.
                let d0 = v[h0] - pivot[h0];
                let d1 = v[h1] - pivot[h1];

                if (version.transform === 'rotate') {
                    const a = angle * w;
                    const cos = Math.cos(a);
                    const sin = Math.sin(a);
                    const r0 = d0 * cos - d1 * sin;
                    const r1 = d0 * sin + d1 * cos;
                    d0 = r0;
                    d1 = r1;
                } else if (version.transform === 'scale') {
                    const s = 1 + (scale - 1) * w;
                    d0 *= s;
                    d1 *= s;
                    // Also grow along the up axis so the gun/turret gets visibly taller.
                    v[up] = pivot[up] + (hval - pivot[up]) * s;
                }

                v[h0] = pivot[h0] + d0;
                v[h1] = pivot[h1] + d1;
                position.setXYZ(i, v.x, v.y, v.z);
            }
        }
        position.needsUpdate = true;
        if (geo.computeVertexNormals) {
            geo.computeVertexNormals();
        }
    }

    // -------------------------------------------------------------- rendering

    /**
     * Show the selected bottom + top version layers and apply the current
     * cross-fade opacity. Bottom is opaque and writes depth; top is drawn over
     * it, semi-transparent, with depthWrite off to avoid z-fighting artifacts.
     *
     * @private
     * @return {void}
     */
    applyState() {
        if (!this.enabled || !this.baseGeometries.length) {
            return;
        }

        // Hide every built layer first.
        this.hideVersionGroups();

        const bottom = this.getVersionGroup(this.bottomId);
        bottom.visible = true;
        this.setGroupAppearance(bottom, 1, true, 0);

        if (this.topId !== this.bottomId) {
            const top = this.getVersionGroup(this.topId);
            top.visible = true;
            this.setGroupAppearance(top, this.opacity, false, 1);
        }

        this.forceRender();
    }

    /**
     * Apply opacity / depth / render order to every mesh in a version group.
     *
     * @private
     * @param {THREE.Group} group - The version group
     * @param {number} opacity - Material opacity [0..1]
     * @param {boolean} depthWrite - Whether meshes write to the depth buffer
     * @param {number} renderOrder - Draw order (higher = later = on top)
     * @return {void}
     */
    setGroupAppearance(group, opacity, depthWrite, renderOrder) {
        group.traverse(obj => {
            if (obj.isMesh && obj.material) {
                obj.material.opacity = opacity;
                obj.material.transparent = opacity < 1;
                obj.material.depthWrite = depthWrite;
                obj.material.needsUpdate = true;
                obj.renderOrder = renderOrder;
                obj.visible = opacity > 0;
            }
        });
    }

    // -------------------------------------------------------------------- DOM

    /**
     * Build the floating control bar: two version dropdowns, a blink-toggle
     * button, and an opacity slider.
     *
     * @private
     * @return {void}
     */
    buildDom() {
        this.barEl = document.createElement('div');
        this.barEl.className = 'bp-m3dvd bp-m3dvd-loading';

        const options = VERSIONS.map(v => `<option value="${v.id}">${v.label}</option>`).join('');

        this.barEl.innerHTML = `
            <div class="bp-m3dvd-title">Version diff</div>
            <label class="bp-m3dvd-field">
                <span class="bp-m3dvd-swatch" data-role="bottom-swatch"></span>
                <span class="bp-m3dvd-label">Base</span>
                <select class="bp-m3dvd-select" data-role="bottom">${options}</select>
            </label>
            <label class="bp-m3dvd-field">
                <span class="bp-m3dvd-swatch" data-role="top-swatch"></span>
                <span class="bp-m3dvd-label">Compare</span>
                <select class="bp-m3dvd-select" data-role="top">${options}</select>
            </label>
            <button type="button" class="bp-m3dvd-blink" data-role="blink">Toggle A / B</button>
            <label class="bp-m3dvd-field bp-m3dvd-opacity">
                <span class="bp-m3dvd-label">Overlay</span>
                <input type="range" min="0" max="100" value="${Math.round(this.opacity * 100)}" data-role="opacity" />
            </label>`;

        this.containerEl.appendChild(this.barEl);

        this.bottomSelect = this.barEl.querySelector('[data-role="bottom"]');
        this.topSelect = this.barEl.querySelector('[data-role="top"]');
        this.opacityInput = this.barEl.querySelector('[data-role="opacity"]');
        this.bottomSelect.value = this.bottomId;
        this.topSelect.value = this.topId;

        this.bottomSelect.addEventListener('change', this.handleBottomChange);
        this.topSelect.addEventListener('change', this.handleTopChange);
        this.opacityInput.addEventListener('input', this.handleOpacityInput);
        this.barEl.querySelector('[data-role="blink"]').addEventListener('click', this.handleBlink);

        this.updateSwatches();
    }

    /**
     * Update the color swatches next to each dropdown to match the version tint.
     *
     * @private
     * @return {void}
     */
    updateSwatches() {
        const toCss = id => {
            const version = VERSIONS.find(v => v.id === id) || VERSIONS[0];
            return `#${version.color.toString(16).padStart(6, '0')}`;
        };
        const bottomSwatch = this.barEl.querySelector('[data-role="bottom-swatch"]');
        const topSwatch = this.barEl.querySelector('[data-role="top-swatch"]');
        bottomSwatch.style.backgroundColor = toCss(this.bottomId);
        topSwatch.style.backgroundColor = toCss(this.topId);
    }

    // ---------------------------------------------------------------- handlers

    handleBottomChange(event) {
        this.bottomId = event.target.value;
        this.updateSwatches();
        this.applyState();
    }

    handleTopChange(event) {
        this.topId = event.target.value;
        this.updateSwatches();
        this.applyState();
    }

    handleOpacityInput(event) {
        this.opacity = Number(event.target.value) / 100;
        this.applyState();
    }

    /**
     * Blink comparison: hard-cut between the two versions. Flips the overlay to
     * fully showing the compare version or fully showing the base — the human
     * eye picks out anything that moved under a hard toggle.
     *
     * @private
     * @return {void}
     */
    handleBlink() {
        this.opacity = this.opacity < 0.5 ? 1 : 0;
        if (this.opacityInput) {
            this.opacityInput.value = String(Math.round(this.opacity * 100));
        }
        this.applyState();
    }
}

export default Model3DVersionDiff;
