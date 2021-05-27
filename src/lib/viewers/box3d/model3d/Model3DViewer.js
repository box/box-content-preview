import React from 'react';
import Box3DViewer from '../Box3DViewer';
import ControlsRoot from '../../controls/controls-root';
import Model3DControls from './Model3DControls';
import Model3DControlsNew from './Model3DControlsNew';
import Model3DRenderer from './Model3DRenderer';
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
        this.initViewer = this.initViewer.bind(this);

        this.onMetadataError = this.onMetadataError.bind(this);
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

        this.emit(EVENT_LOAD);

        return true;
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
                isPlaying={this.isAnimationPlaying}
                isVrShown={this.showVrButton}
                onAnimationClipSelect={this.handleSelectAnimationClip}
                onCameraProjectionChange={this.handleSetCameraProjection}
                onFullscreenToggle={this.toggleFullscreen}
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
                renderMode={this.renderMode}
                showGrid={this.showGrid}
                showSkeletons={this.showSkeletons}
                showWireframes={this.showWireframes}
            />,
        );
    }
}

export default Model3DViewer;
