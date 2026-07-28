import React from 'react';
import Box3DViewer from '../Box3DViewer';
import ControlsRoot from '../../controls/controls-root';
import Model3DControls from './Model3DControls';
import Model3DControlsNew from './Model3DControlsNew';
import Model3DAnnotationsDemo from './Model3DAnnotationsDemo';
import Model3DWatermark from './Model3DWatermark';
import Model3DRenderer from './Model3DRenderer';
import { saveThumbnail } from './threeDThumbnailStore';
import {
    CAMERA_PROJECTION_PERSPECTIVE,
    EVENT_CANVAS_CLICK,
    EVENT_ROTATE_ON_AXIS,
    EVENT_SELECT_ANIMATION_CLIP,
    EVENT_SET_CAMERA_PROJECTION,
    EVENT_SET_RENDER_MODE,
    EVENT_SET_SKELETONS_VISIBLE,
    EVENT_SET_WIREFRAMES_VISIBLE,
    EVENT_SET_GRID_VISIBLE,
    EVENT_TOGGLE_ANIMATION,
    EVENT_TOGGLE_HELPERS,
    RENDER_MODE_LIT,
} from './model3DConstants';
import { CSS_CLASS_INVISIBLE, EVENT_LOAD } from '../box3DConstants';
import './Model3D.scss';

const DEFAULT_AXIS_UP = '+Y';
const DEFAULT_AXIS_FORWARD = '+Z';
const DEFAULT_RENDER_GRID = true;
const LOAD_TIMEOUT = 180000; // 3 minutes

/**
 * Model3d
 * This is the entry point for the model3d preview.
 */
class Model3DViewer extends Box3DViewer {
    /** @property {Object[]} - List of animation clips for the given Box3D file */
    animationClips = [];

    /** @property {Object} - Tracks up and forward axes for the model alignment in the scene */
    axes = {
        up: null,
        forward: null,
    };

    /** @property {Object} - Stores the defaults for the model settings */
    defaults = {
        projection: CAMERA_PROJECTION_PERSPECTIVE,
        renderMode: RENDER_MODE_LIT,
        showGrid: true,
    };

    /** @property {Object[]} - List of Box3D instances added to the scene */
    instances = [];

    /** @property {boolean} - Boolean indicating whether the animation is playing */
    isAnimationPlaying = false;

    /** @property {string} - string indicating what the camera projection is */
    projection = CAMERA_PROJECTION_PERSPECTIVE;

    /** @property {string} - string indicating what the render mode is */
    renderMode = RENDER_MODE_LIT;

    /** @property {boolean} - Boolean indicating whether the grid is showing */
    showGrid = DEFAULT_RENDER_GRID;

    /** @property {boolean} - Boolean indicating whether the skeletons are showing */
    showSkeletons = false;

    /** @property {boolean} - Boolean indicating whether the wireframes are showing */
    showWireframes = false;

    /** @property {boolean} - Whether the 3D comment placement mode is active (demo) */
    isCommentModeActive = false;

    /** @property {boolean} - Whether the 3D freehand draw mode is active (demo) */
    isDrawModeActive = false;

    /** @property {boolean} - Whether the pan (spacebar-drag) mode is active (demo) */
    isPanModeActive = false;

    /** @property {boolean} - Whether the forensic watermark overlay is shown (demo) */
    isWatermarkActive = true;

    /** @property {number} - Current zoom scale (1 = fit-to-view). Zoom % = fitDistance / orbitDistance. */
    zoomScale = 1;

    /** @property {number} - Orbit distance at fit-to-view, captured on reset; the 100% baseline. */
    fitOrbitDistance = null;

    /** @inheritdoc */
    constructor(option) {
        super(option);

        this.handleRotateOnAxis = this.handleRotateOnAxis.bind(this);
        this.handleSelectAnimationClip = this.handleSelectAnimationClip.bind(this);
        this.handleSetCameraProjection = this.handleSetCameraProjection.bind(this);
        this.handleSetRenderMode = this.handleSetRenderMode.bind(this);
        this.handleShowSkeletons = this.handleShowSkeletons.bind(this);
        this.handleShowWireframes = this.handleShowWireframes.bind(this);
        this.handleShowGrid = this.handleShowGrid.bind(this);
        this.handleToggleAnimation = this.handleToggleAnimation.bind(this);
        this.handleToggleHelpers = this.handleToggleHelpers.bind(this);
        this.handleCanvasClick = this.handleCanvasClick.bind(this);
        this.handleCommentToggle = this.handleCommentToggle.bind(this);
        this.handleDrawToggle = this.handleDrawToggle.bind(this);
        this.handlePanToggle = this.handlePanToggle.bind(this);
        this.handleWatermarkToggle = this.handleWatermarkToggle.bind(this);
        this.handleZoomIn = this.handleZoomIn.bind(this);
        this.handleZoomOut = this.handleZoomOut.bind(this);
        this.initViewer = this.initViewer.bind(this);

        this.onMetadataError = this.onMetadataError.bind(this);
    }

    /**
     * @inheritdoc
     */
    destroy() {
        if (this.annotationsDemo) {
            this.annotationsDemo.destroy();
            this.annotationsDemo = null;
        }

        if (this.watermark) {
            this.watermark.destroy();
            this.watermark = null;
        }

        super.destroy();
    }

    /**
     * @inheritdoc
     */
    setup() {
        if (this.isSetup) {
            return;
        }

        // Call super() first to set up common layout
        super.setup();

        this.wrapperEl.classList.add(CSS_CLASS_INVISIBLE);

        this.loadTimeout = LOAD_TIMEOUT;
    }

    /**
     * @inheritdoc
     */
    createSubModules() {
        this.controls = this.getViewerOption('useReactControls')
            ? new ControlsRoot({ containerEl: this.wrapperEl, fileId: this.options.file.id })
            : new Model3DControls(this.wrapperEl);
        this.renderer = new Model3DRenderer(this.wrapperEl, this.boxSdk, { api: this.api });
    }

    /**
     * @inheritdoc
     */
    attachEventHandlers() {
        super.attachEventHandlers();

        if (this.controls && !this.getViewerOption('useReactControls')) {
            this.controls.on(EVENT_ROTATE_ON_AXIS, this.handleRotateOnAxis);
            this.controls.on(EVENT_SELECT_ANIMATION_CLIP, this.handleSelectAnimationClip);
            this.controls.on(EVENT_SET_CAMERA_PROJECTION, this.handleSetCameraProjection);
            this.controls.on(EVENT_SET_RENDER_MODE, this.handleSetRenderMode);
            this.controls.on(EVENT_SET_SKELETONS_VISIBLE, this.handleShowSkeletons);
            this.controls.on(EVENT_SET_WIREFRAMES_VISIBLE, this.handleShowWireframes);
            this.controls.on(EVENT_SET_GRID_VISIBLE, this.handleShowGrid);
            this.controls.on(EVENT_TOGGLE_ANIMATION, this.handleToggleAnimation);
            this.controls.on(EVENT_TOGGLE_HELPERS, this.handleToggleHelpers);
        }

        if (this.renderer) {
            this.renderer.on(EVENT_CANVAS_CLICK, this.handleCanvasClick);
        }
    }

    /**
     * @inheritdoc
     */
    detachEventHandlers() {
        super.detachEventHandlers();

        if (this.controls && !this.getViewerOption('useReactControls')) {
            this.controls.removeListener(EVENT_ROTATE_ON_AXIS, this.handleRotateOnAxis);
            this.controls.removeListener(EVENT_SELECT_ANIMATION_CLIP, this.handleSelectAnimationClip);
            this.controls.removeListener(EVENT_SET_CAMERA_PROJECTION, this.handleSetCameraProjection);
            this.controls.removeListener(EVENT_SET_RENDER_MODE, this.handleSetRenderMode);
            this.controls.removeListener(EVENT_SET_SKELETONS_VISIBLE, this.handleShowSkeletons);
            this.controls.removeListener(EVENT_SET_WIREFRAMES_VISIBLE, this.handleShowWireframes);
            this.controls.removeListener(EVENT_SET_GRID_VISIBLE, this.handleShowGrid);
            this.controls.removeListener(EVENT_TOGGLE_ANIMATION, this.handleToggleAnimation);
            this.controls.removeListener(EVENT_TOGGLE_HELPERS, this.handleToggleHelpers);
        }

        if (this.renderer) {
            this.renderer.removeListener(EVENT_CANVAS_CLICK, this.handleCanvasClick);
        }
    }

    /**
     * Handle animation clip selection.
     * @method handleSelectAnimationClip
     * @private
     * @param {string} clipId - The ID of the clip that was selected.
     * @return {void}
     */
    handleSelectAnimationClip(clipId) {
        this.renderer.setAnimationClip(clipId);
        this.setAnimationState(false);
    }

    /**
     * Handle model rotation event
     * @param  {Object}  axis An object describing the axis to rotate on
     * @return {void}
     */
    handleRotateOnAxis(axis) {
        this.renderer.rotateOnAxis(axis);
    }

    /**
     * Handle hard set of axes
     * @param {string} upAxis - Up axis for model
     * @param {string} forwardAxis - Forward axis for model
     * @param {boolean} transition - True to trigger a smooth rotationd transition, false for snap to rotation
     * @return {void}
     */
    handleRotationAxisSet(upAxis, forwardAxis, transition = true) {
        this.renderer.setAxisRotation(upAxis, forwardAxis, transition);
    }

    /**
     * @inheritdoc
     */
    handleSceneLoaded() {
        this.loaded = true;
        // Get scene defaults for up/forward axes, and render mode
        return this.boxSdk
            .getMetadataClient()
            .get(this.options.file.id, 'global', 'box3d')
            .then(response => {
                // Treat non-200 responses as errors.
                if (response.status !== 200) {
                    throw new Error(`Received unsuccessful response status: ${response.status}`);
                }

                return response.response;
            })
            .catch(this.onMetadataError)
            .then(this.initViewer);
    }

    initViewer(defaults) {
        if (this.controls) {
            if (this.getViewerOption('useReactControls')) {
                this.renderUI();
            } else {
                this.controls.addUi();
            }
        }

        this.axes.up = defaults.upAxis || DEFAULT_AXIS_UP;
        this.axes.forward = defaults.forwardAxis || DEFAULT_AXIS_FORWARD;
        this.renderMode = defaults.defaultRenderMode || RENDER_MODE_LIT;
        this.projection = defaults.cameraProjection || CAMERA_PROJECTION_PERSPECTIVE;
        if (defaults.renderGrid === 'true') {
            this.showGrid = true;
        } else if (defaults.renderGrid === 'false') {
            this.showGrid = false;
        } else {
            this.showGrid = DEFAULT_RENDER_GRID;
        }

        // Save the defaults so handleReset will change the values appropriately
        this.defaults = {
            projection: this.projection,
            renderMode: this.renderMode,
            showGrid: this.showGrid,
        };

        if (this.axes.up !== DEFAULT_AXIS_UP || this.axes.forward !== DEFAULT_AXIS_FORWARD) {
            this.handleRotationAxisSet(this.axes.up, this.axes.forward, false);
        }

        // Update controls ui
        this.handleReset();

        // Initialize animation controls when animations are present.
        this.populateAnimationControls();

        this.showWrapper();

        this.initWatermark();

        this.initAnnotationsDemo();

        this.emit(EVENT_LOAD);

        this.captureThumbnail();

        return true;
    }

    /**
     * DEMO ONLY: capture a still image of the loaded model and stash it in
     * localStorage keyed by file id, so EndUserApp can render it as a folder
     * thumbnail for 3D files (which have no server-generated image rep).
     *
     * The Box3D runtime creates its WebGL canvas with preserveDrawingBuffer=true,
     * so canvas.toDataURL() returns real pixels. The engine renders on demand, so
     * we force a fresh frame and capture on the next animation frame. The floor
     * grid is hidden for the capture, then restored, to match the clean icon look.
     *
     * @private
     * @return {void}
     */
    captureThumbnail() {
        const fileId = this.options && this.options.file && this.options.file.id;
        const canvas = this.renderer && this.renderer.box3d && this.renderer.box3d.canvas;
        if (!fileId || !canvas) {
            return;
        }

        const gridWasVisible = this.showGrid;
        if (this.renderer.setGridVisible) {
            this.renderer.setGridVisible(false);
        }
        this.renderer.box3d.needsRender = true;

        window.requestAnimationFrame(() => {
            if (this.destroyed) {
                return;
            }
            saveThumbnail(String(fileId), canvas);
            if (this.renderer && this.renderer.setGridVisible) {
                this.renderer.setGridVisible(gridWasVisible);
            }
            if (this.renderer && this.renderer.box3d) {
                this.renderer.box3d.needsRender = true;
            }
        });
    }

    /**
     * DEMO ONLY: mount the forensic watermark overlay (user / date / file id).
     *
     * @private
     * @return {void}
     */
    initWatermark() {
        if (this.watermark) {
            return;
        }

        const { file = {} } = this.options;

        this.watermark = new Model3DWatermark({
            containerEl: this.wrapperEl,
            fileId: file.id,
        });
        this.watermark.init();
        this.watermark.setVisible(this.isWatermarkActive);
    }

    /**
     * DEMO ONLY: mount the 3D annotations spike (camera-pose comments, faked API).
     *
     * @private
     * @return {void}
     */
    initAnnotationsDemo() {
        if (this.annotationsDemo) {
            return;
        }

        this.annotationsDemo = new Model3DAnnotationsDemo({
            containerEl: this.wrapperEl,
            fileId: this.options.file.id,
            renderer: this.renderer,
            onPlacementModeChange: active => {
                this.isCommentModeActive = active;
                if (this.getViewerOption('useReactControls')) {
                    this.renderUI();
                }
            },
            onDrawModeChange: active => {
                this.isDrawModeActive = active;
                if (this.getViewerOption('useReactControls')) {
                    this.renderUI();
                }
            },
            onPanModeChange: active => {
                this.isPanModeActive = active;
                if (this.getViewerOption('useReactControls')) {
                    this.renderUI();
                }
            },
        });
        this.annotationsDemo.init();
    }

    handleCommentToggle() {
        if (this.annotationsDemo) {
            this.annotationsDemo.setPlacementMode(!this.isCommentModeActive);
        }
    }

    handleDrawToggle() {
        if (this.annotationsDemo) {
            this.annotationsDemo.setDrawMode(!this.isDrawModeActive);
        }
    }

    handlePanToggle() {
        if (this.annotationsDemo) {
            this.annotationsDemo.setPanMode(!this.isPanModeActive);
        }
    }

    handleWatermarkToggle() {
        this.isWatermarkActive = !this.isWatermarkActive;
        if (this.watermark) {
            this.watermark.setVisible(this.isWatermarkActive);
        }
        if (this.getViewerOption('useReactControls')) {
            this.renderUI();
        }
    }

    /**
     * Get the orbit_camera controller for the current camera, or null.
     *
     * @private
     * @return {Object|null} Orbit controller component
     */
    getOrbitController() {
        const camera = this.renderer && this.renderer.getCamera();
        return camera ? camera.getComponentByScriptId('orbit_camera') : null;
    }

    /**
     * Recompute zoom scale from the live orbit distance and re-render the UI.
     * Zoom % is defined relative to the fit-to-view distance (100% = fitted);
     * getting closer (smaller orbit distance) increases the percentage.
     *
     * @private
     * @return {void}
     */
    syncZoomScale() {
        const orbit = this.getOrbitController();
        if (!orbit) {
            return;
        }

        const distance = orbit.getOrbitDistance();
        if (this.fitOrbitDistance == null && distance) {
            this.fitOrbitDistance = distance;
        }

        this.zoomScale = this.fitOrbitDistance && distance ? this.fitOrbitDistance / distance : 1;

        if (this.controls && this.getViewerOption('useReactControls')) {
            this.renderUI();
        }
    }

    /**
     * Zoom the camera by scaling its orbit distance. `direction` > 0 zooms in
     * (smaller distance), < 0 zooms out.
     *
     * @private
     * @param {number} direction - +1 to zoom in, -1 to zoom out
     * @return {void}
     */
    handleZoom(direction) {
        const orbit = this.getOrbitController();
        if (!orbit) {
            return;
        }

        const distance = orbit.getOrbitDistance();
        // 15% closer / farther per click.
        const factor = direction > 0 ? 1 / 1.15 : 1.15;
        orbit.setOrbitDistance(distance * factor);
        this.renderer.box3d.needsRender = true;
        this.syncZoomScale();
    }

    handleZoomIn() {
        this.handleZoom(1);
    }

    handleZoomOut() {
        this.handleZoom(-1);
    }

    /**
     * Handle error triggered by metadata load issues
     *
     * @param {Error} err - The error thrown when trying to load metadata
     * @return {void}
     */
    onMetadataError(err) {
        // eslint-disable-next-line
        console.error('Error loading metadata:', err.toString());

        // Continue with default settings.
        return {};
    }

    /**
     * Populate control bar with animation playback UI.
     *
     * @method populateAnimationControls
     * @private
     * @return {void}
     */
    populateAnimationControls() {
        if (!this.controls) {
            return;
        }

        const animations = this.renderer.box3d.getEntitiesByType('animation');
        if (animations.length > 0) {
            const clipIds = animations[0].getClipIds();

            if (this.getViewerOption('useReactControls')) {
                this.animationClips = clipIds.map(clipId => {
                    const { name, start, stop } = animations[0].getClip(clipId);
                    const duration = stop - start;
                    return {
                        duration,
                        id: clipId,
                        name,
                    };
                });

                this.renderer.setAnimationClip(this.animationClips[0].id);

                this.renderUI();
            } else {
                clipIds.forEach(clipId => {
                    const clip = animations[0].getClip(clipId);
                    const duration = clip.stop - clip.start;
                    this.controls.addAnimationClip(clipId, clip.name, duration);
                });

                if (clipIds.length > 0) {
                    this.controls.showAnimationControls();
                    this.controls.selectAnimationClip(clipIds[0]);
                }
            }
        }
    }

    /**
     * Handle animation playback (play / pause).
     * @method handleToggleAnimation
     * @private
     * @param {boolean} play True to force the animation to play.
     * @return {void}
     */
    handleToggleAnimation(play) {
        this.setAnimationState(play);
    }

    setAnimationState(play) {
        this.isAnimationPlaying = play;
        this.renderer.toggleAnimation(this.isAnimationPlaying);

        if (this.controls && this.getViewerOption('useReactControls')) {
            this.renderUI();
        }
    }

    /**
     * Handle canvas focus events.
     * @method handleCanvasClick
     * @private
     * @return {void}
     */
    handleCanvasClick() {
        if (!this.getViewerOption('useReactControls')) {
            this.controls.hidePullups();
        }
    }

    /**
     * Show the preview wrapper container element
     *
     * @return {void}
     */
    showWrapper() {
        this.wrapperEl.classList.remove(CSS_CLASS_INVISIBLE);
    }

    /**
     * @inheritdoc
     */
    handleReset() {
        const { projection, renderMode, showGrid } = this.defaults;

        super.handleReset();

        this.setAnimationState(false);
        this.handleSetCameraProjection(projection);
        this.handleSetRenderMode(renderMode);
        this.handleShowGrid(showGrid);
        this.handleShowSkeletons(false);
        this.handleShowWireframes(false);

        if (this.controls) {
            if (this.getViewerOption('useReactControls')) {
                this.renderUI();
            } else {
                this.controls.handleSetRenderMode(renderMode);
                this.controls.setCurrentProjectionMode(projection);
                this.controls.handleSetSkeletonsVisible(false);
                this.controls.handleSetWireframesVisible(false);
                this.controls.handleSetGridVisible(showGrid);
            }
        }

        if (this.renderer) {
            this.handleRotationAxisSet(this.axes.up, this.axes.forward, false);
            this.renderer.stopAnimation();
            this.renderer.resetView();
            // resetView() re-fits the model; recapture that distance as the 100% baseline.
            this.fitOrbitDistance = null;
            this.syncZoomScale();
        }
    }

    /**
     * Handle set render mode event
     *
     * @param {string} mode - The selected render mode string
     * @return {void}
     */
    handleSetRenderMode(mode = 'Lit') {
        this.renderer.setRenderMode(mode);

        if (this.controls && this.getViewerOption('useReactControls')) {
            this.renderMode = mode;
            this.renderUI();
        }
    }

    /**
     * Show, hide or toggle the 'helpers' in the scene. These include the grid display
     * and axis markings.
     *
     * @method handleToggleHelpers
     * @private
     * @param {boolean} show - True or false to show or hide. If not specified, the helpers will be toggled.
     * @return {void}
     */
    handleToggleHelpers(show) {
        this.renderer.toggleHelpers(show);
    }

    /**
     * Handle setting camera projection
     *
     * @private
     * @param {string} projection - Camera projection
     * @return {void}
     */
    handleSetCameraProjection(projection) {
        this.renderer.setCameraProjection(projection);

        if (this.controls && this.getViewerOption('useReactControls')) {
            this.projection = projection;
            this.renderUI();
        }
    }

    /**
     * Handle setting skeleton visibility.
     *
     * @private
     * @param {boolean} visible - Indicates whether or not skeletons are visible.
     * @return {void}
     */
    handleShowSkeletons(visible) {
        this.renderer.setSkeletonsVisible(visible);

        if (this.controls && this.getViewerOption('useReactControls')) {
            this.showSkeletons = visible;
            this.renderUI();
        }
    }

    /**
     * Handle setting wireframe visibility.
     *
     * @private
     * @param {boolean} visible - Indicates whether or not wireframes are visible.
     * @return {void}
     */
    handleShowWireframes(visible) {
        this.renderer.setWireframesVisible(visible);

        if (this.controls && this.getViewerOption('useReactControls')) {
            this.showWireframes = visible;
            this.renderUI();
        }
    }

    /**
     * Handle setting grid visibility.
     *
     * @private
     * @param {boolean} visible - Indicates whether or not the grid is visible.
     * @return {void}
     */
    handleShowGrid(visible) {
        this.renderer.setGridVisible(visible);

        if (this.controls && this.getViewerOption('useReactControls')) {
            this.showGrid = visible;
            this.renderUI();
        }
    }

    /**
     * @inheritdoc
     */
    handleShowVrButton() {
        if (this.controls && this.getViewerOption('useReactControls')) {
            this.showVrButton = true;
            this.renderUI();
        } else {
            this.controls.showVrButton();
        }
    }

    renderUI() {
        if (!this.controls || !this.renderer) {
            return;
        }

        this.controls.render(
            <Model3DControlsNew
                animationClips={this.animationClips}
                cameraProjection={this.projection}
                currentAnimationClipId={this.renderer.getAnimationClip()}
                isCommentModeActive={this.isCommentModeActive}
                isDrawModeActive={this.isDrawModeActive}
                isPanModeActive={this.isPanModeActive}
                isPlaying={this.isAnimationPlaying}
                isVrShown={this.showVrButton}
                isWatermarkActive={this.isWatermarkActive}
                onAnimationClipSelect={this.handleSelectAnimationClip}
                onCameraProjectionChange={this.handleSetCameraProjection}
                onCommentToggle={this.handleCommentToggle}
                onDrawToggle={this.handleDrawToggle}
                onFullscreenToggle={this.toggleFullscreen}
                onPanToggle={this.handlePanToggle}
                onPlayPause={this.handleToggleAnimation}
                onRenderModeChange={this.handleSetRenderMode}
                onReset={this.handleReset}
                onRotateOnAxisChange={this.handleRotateOnAxis}
                onSettingsClose={() => this.handleToggleHelpers(false)}
                onSettingsOpen={() => this.handleToggleHelpers(true)}
                onShowGridToggle={this.handleShowGrid}
                onShowSkeletonsToggle={this.handleShowSkeletons}
                onShowWireframesToggle={this.handleShowWireframes}
                onVrToggle={this.handleToggleVr}
                onWatermarkToggle={this.handleWatermarkToggle}
                onZoomIn={this.handleZoomIn}
                onZoomOut={this.handleZoomOut}
                renderMode={this.renderMode}
                scale={this.zoomScale}
                showGrid={this.showGrid}
                showSkeletons={this.showSkeletons}
                showWireframes={this.showWireframes}
            />,
        );
    }
}

export default Model3DViewer;
