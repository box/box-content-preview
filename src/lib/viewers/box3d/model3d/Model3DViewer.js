import autobind from 'autobind-decorator';
import Box3DViewer from '../Box3DViewer';
import Model3DControls from './Model3DControls';
import Model3DRenderer from './Model3DRenderer';
import {
    CAMERA_PROJECTION_PERSPECTIVE,
    EVENT_CANVAS_CLICK,
    EVENT_ROTATE_ON_AXIS,
    EVENT_SELECT_ANIMATION_CLIP,
    EVENT_SET_CAMERA_PROJECTION,
    EVENT_SET_QUALITY_LEVEL,
    EVENT_SET_RENDER_MODE,
    EVENT_SET_SKELETONS_VISIBLE,
    EVENT_SET_WIREFRAMES_VISIBLE,
    EVENT_SET_GRID_VISIBLE,
    EVENT_TOGGLE_ANIMATION,
    EVENT_TOGGLE_HELPERS,
    RENDER_MODE_LIT
} from './model3DConstants';
import { CSS_CLASS_INVISIBLE, EVENT_LOAD } from '../box3DConstants';
import './Model3D.scss';

const DEFAULT_AXIS_UP = '+Y';
const DEFAULT_AXIS_FORWARD = '+Z';
const DEFAULT_RENDER_GRID = true;

/**
 * Model3d
 * This is the entry point for the model3d preview.
 * @class
 */
@autobind
class Model3DViewer extends Box3DViewer {
    /**
     * @inheritdoc
     */
    setup() {
        // Call super() first to set up common layout
        super.setup();

        this.wrapperEl.classList.add(CSS_CLASS_INVISIBLE);

        this.loadTimeout = 180000; // 3 minutes
        this.instances = [];
        this.assets = [];
        this.axes = {
            up: null,
            forward: null
        };
    }

    /**
     * @inheritdoc
     */
    createSubModules() {
        this.controls = new Model3DControls(this.wrapperEl);
        this.renderer = new Model3DRenderer(this.wrapperEl, this.boxSdk);
    }

    /**
     * @inheritdoc
     */
    attachEventHandlers() {
        super.attachEventHandlers();

        if (this.controls) {
            this.controls.on(EVENT_ROTATE_ON_AXIS, this.handleRotateOnAxis);
            this.controls.on(EVENT_SELECT_ANIMATION_CLIP, this.handleSelectAnimationClip);
            this.controls.on(EVENT_SET_CAMERA_PROJECTION, this.handleSetCameraProjection);
            this.controls.on(EVENT_SET_QUALITY_LEVEL, this.handleSetQualityLevel);
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

        if (this.controls) {
            this.controls.removeListener(EVENT_ROTATE_ON_AXIS, this.handleRotateOnAxis);
            this.controls.removeListener(EVENT_SELECT_ANIMATION_CLIP, this.handleSelectAnimationClip);
            this.controls.removeListener(EVENT_SET_CAMERA_PROJECTION, this.handleSetCameraProjection);
            this.controls.removeListener(EVENT_SET_QUALITY_LEVEL, this.handleSetQualityLevel);
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
     * Sets the scale used to render the model. This is the size of the largest dimension of
     * the model in meters. Default is 1.
     * @method setModelScale
     * @public
     * @param {Float} newSize - The size of the largest dimension of the model in metres.
     * Default is 1 m.
     * @return {void}
     */
    /* istanbul ignore next: @mbond has gotten rid of this in his incoming branch */
    setModelScale(newSize) {
        if (!this.renderer) {
            return;
        }

        this.renderer.modelSize = newSize;
        if (!this.renderer.instance || this.renderer.vrEnabled) {
            return;
        }
        this.renderer.instance.scaleToSize(newSize);
        this.renderer.reset();
    }

    /**
     * Set the position of the model relative a point and the model's bounding box.
     * @method setModelAlignment
     * @public
     * @param {Vector3} position        The position in world space to position the model
     * relative to.
     * @param {Vector3} alignmentVector - An object of the form { x: x, y: y, z: z} where - the
     * values for x, y and z are between -1 and +1 and specify how the object is aligned to
     * the edges of the model. e.g. { x: 0, y: -1, z: 0 } will align the bottom, centre of the
     * object to the specified position.
     * @return {void}
     */
    /* istanbul ignore next: @mbond has gotten rid of this in his incoming branch */
    setModelAlignment(position, alignmentVector) {
        if (!this.renderer) {
            return;
        }
        this.renderer.modelAlignmentPosition = position;
        this.renderer.modelAlignmentVector = alignmentVector;
        if (!this.renderer.instance) {
            return;
        }
        this.renderer.instance.alignToPosition(position, alignmentVector);
        this.renderer.reset();
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
        return this.boxSdk.getMetadataClient().get(this.options.file.id, 'global', 'box3d')
            .then((response) => {
                // Treat non-200 responses as errors.
                if (response.status !== 200) {
                    throw new Error(`Received unsuccessful response status: ${response.status}`);
                }

                return response.response;
            })
            .catch(this.onMetadataError)
            .then((defaults) => {
                if (this.controls) {
                    this.controls.addUi();
                }

                this.axes.up = defaults.upAxis || DEFAULT_AXIS_UP;
                this.axes.forward = defaults.forwardAxis || DEFAULT_AXIS_FORWARD;
                this.renderMode = defaults.defaultRenderMode || RENDER_MODE_LIT;
                this.projection = defaults.cameraProjection || CAMERA_PROJECTION_PERSPECTIVE;
                this.renderGrid = defaults.renderGrid || DEFAULT_RENDER_GRID;

                if (this.axes.up !== DEFAULT_AXIS_UP || this.axes.forward !== DEFAULT_AXIS_FORWARD) {
                    this.handleRotationAxisSet(this.axes.up, this.axes.forward, false);
                }

                // Update controls ui
                this.handleReset();

                // Initialize animation controls when animations are present.
                this.populateAnimationControls();

                this.showWrapper();
                this.renderer.initVr();
                this.renderer.initVrGamepadControls();
                this.emit(EVENT_LOAD);

                return true;
            });
    }

    /**
     * Handle error triggered by metadata load issues
     * @param err {Error} The error thrown when trying to load metadata
     * @return {void}
     */
    onMetadataError(err) {
        /* eslint-disable no-console */
        console.error('Error loading metadata:', err.toString());
        /* eslint-enable no-console */

        // Continue with default settings.
        return {};
    }

    /**
     * Populate control bar with animation playback UI.
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

            clipIds.forEach((clipId) => {
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

    /**
     * Handle animation playback (play / pause).
     * @method handleToggleAnimation
     * @private
     * @param {boolean} play True to force the animation to play.
     * @return {void}
     */
    handleToggleAnimation(play) {
        this.renderer.toggleAnimation(play);
    }

    /**
     * Handle canvas focus events.
     * @method handleCanvasClick
     * @private
     * @return {void}
     */
    handleCanvasClick() {
        this.controls.hidePullups();
    }

    /**
     * Show the preview wrapper container element
     * @return {void}
     */
    showWrapper() {
        this.wrapperEl.classList.remove(CSS_CLASS_INVISIBLE);
    }

    /**
     * @inheritdoc
     */
    handleReset() {
        super.handleReset();

        if (this.controls) {
            this.controls.handleSetRenderMode(this.renderMode);
            this.controls.setCurrentProjectionMode(this.projection);
            this.controls.handleSetSkeletonsVisible(false);
            this.controls.handleSetWireframesVisible(false);
            this.controls.handleSetGridVisible(this.renderGrid);
        }

        if (this.renderer) {
            this.handleRotationAxisSet(this.axes.up, this.axes.forward, true);
            this.renderer.stopAnimation();
        }
    }

    /**
     * Handle set render mode event
     * @param  {string} mode The selected render mode string
     * @return {void}
     */
    handleSetRenderMode(mode = 'Lit') {
        this.renderer.setRenderMode(mode);
    }

    /**
     * Show, hide or toggle the 'helpers' in the scene. These include the grid display
     * and axis markings.
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
     * @private
     * @return {void}
     */
    handleSetCameraProjection(projection) {
        this.renderer.setCameraProjection(projection);
    }

    /**
     * Handle setting quality level for rendering
     * @private
     * @return {void}
     */
    handleSetQualityLevel(level) {
        this.renderer.setQualityLevel(level);
    }

    /**
     * Handle setting skeleton visibility.
     * @private
     * @param {boolean} visible - Indicates whether or not skeletons are visible.
     * @return {void}
     */
    handleShowSkeletons(visible) {
        this.renderer.setSkeletonsVisible(visible);
    }

    /**
     * Handle setting wireframe visibility.
     * @private
     * @param {boolean} visible - Indicates whether or not wireframes are visible.
     * @return {void}
     */
    handleShowWireframes(visible) {
        this.renderer.setWireframesVisible(visible);
    }

    /**
     * Handle setting grid visibility.
     * @private
     * @param {boolean} visible - Indicates whether or not the grid is visible.
     * @return {void}
     */
    handleShowGrid(visible) {
        this.renderer.setGridVisible(visible);
    }
}

export default Model3DViewer;
