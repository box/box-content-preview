import autobind from 'autobind-decorator';
import Box3D from '../box3d';
import Model3dControls from './model3d-controls';
import Model3dRenderer from './model3d-renderer';

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
    EVENT_TOGGLE_ANIMATION,
    EVENT_TOGGLE_HELPERS,
    RENDER_MODE_LIT
} from './model3d-constants';

import {
    CSS_CLASS_INVISIBLE,
    EVENT_LOAD
} from '../box3d-constants';

import './model3d.scss';

const Box = global.Box || {};

const DEFAULT_AXIS_UP = '+Y';
const DEFAULT_AXIS_FORWARD = '+Z';

/**
 * Model3d
 * This is the entry point for the model3d preview.
 * @class
 */
@autobind
class Model3d extends Box3D {
    /**
     * Ties together rendering, settings, and controls modules
     * @constructor
     * @param {string|HTMLElement} container - node
     * @param {object} [options] - some options
     * @return {Model3d} the Model3d object instance
     */
    constructor(container, options) {
        super(container, options);

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
        this.controls = new Model3dControls(this.wrapperEl);
        this.renderer = new Model3dRenderer(this.wrapperEl, this.boxSdk);
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
            this.controls.on(EVENT_TOGGLE_ANIMATION, this.handleToggleAnimation);
            this.controls.on(EVENT_TOGGLE_HELPERS, this.handleToggleHelpers);
        }

        this.renderer.on(EVENT_CANVAS_CLICK, this.handleCanvasClick);
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
            this.controls.removeListener(EVENT_TOGGLE_ANIMATION, this.handleToggleAnimation);
            this.controls.removeListener(EVENT_TOGGLE_HELPERS, this.handleToggleHelpers);
        }

        this.renderer.removeListener(EVENT_CANVAS_CLICK, this.handleCanvasClick);
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
    setModelScale(newSize) {
        if (!this.renderer) {
            return;
        }
        this.renderer.modelSize = newSize;
        if (!this.renderer.instance) {
            return;
        }
        if (!this.renderer.vrEnabled) {
            this.renderer.instance.scaleToSize(newSize);
        }
    }

    /**
     * Sets the scale used to render the model when in VR mode.
     * @method setModelScaleVr
     * @public
     * @param {Float} newSize - The size of the largest dimension of the model in metres.
     * Default is 1 m.
     * @return {void}
     */
    setModelScaleVr(newSize) {
        if (!this.renderer) {
            return;
        }
        this.renderer.modelVrSize = newSize;
        if (!this.renderer.instance) {
            return;
        }
        if (this.renderer.vrEnabled) {
            this.renderer.instance.scaleToSize(newSize);
        }
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
    setModelAlignment(position, alignmentVector) {
        if (this.renderer) {
            this.renderer.modelAlignmentPosition = position;
            this.renderer.modelAlignmentVector = alignmentVector;
            if (!this.renderer.instance) {
                return;
            }
            if (!this.renderer.vrEnabled) {
                this.renderer.instance.alignToPosition(position, alignmentVector);
            }
        }
    }

    /**
     * Set the position of the model in VR mode relative a point and the model's bounding box.
     * @method setModelAlignmentVr
     * @public
     * @param {Vector3} position        The position in world space to position the model
     * relative to.
     * @param {Vector3} alignmentVector - An object of the form { x: x, y: y, z: z} where - the
     * values for x, y and z are between -1 and +1 and specify how the object is aligned to
     * the edges of the model. e.g. { x: 0, y: -1, z: 0 } will align the bottom, centre of the
     * object to the specified position.
     * @return {void}
     */
    setModelAlignmentVr(position, alignmentVector) {
        if (this.renderer) {
            this.renderer.modelVrAlignmentPosition = position;
            this.renderer.modelVrAlignmentVector = alignmentVector;
            if (!this.renderer.instance) {
                return;
            }
            if (this.renderer.vrEnabled) {
                this.renderer.instance.alignToPosition(position, alignmentVector);
            }
        }
    }

    /**
     * Handle animation clip selection.
     * @method handleSelectAnimationClip
     * @private
     * @param {string} clipId - The ID of the clip that was selected.
     * @return {void}
     */
    @autobind
    handleSelectAnimationClip(clipId) {
        this.renderer.setAnimationClip(clipId);
    }

    /**
     * Handle model rotation event
     * @param  {Object}  axis An object describing the axis to rotate on
     * @return {void}
     */
    @autobind
    handleRotateOnAxis(axis) {
        this.renderer.rotateOnAxis(axis);
    }

    /**
     * Handle hard set of axes
     * @param {string} upAxis - Up axis for model
     * @param {[type]} forwardAxis - Forward axis for model
     * @param {[type]} transition - True to trigger a smooth rotationd transition, false for snap to rotation
     * @return {void}
     */
    @autobind
    handleRotationAxisSet(upAxis, forwardAxis, transition = true) {
        this.renderer.setAxisRotation(upAxis, forwardAxis, transition);
    }

    /**
     * @inheritdoc
     */
    @autobind
    handleSceneLoaded() {
        this.loaded = true;

        // Get scene defaults for up/forward axes, and render mode
        this.boxSdk.getMetadataClient().get(this.options.file.id, 'global', 'box3d')
            .then((response) => {
                // Treat non-200 responses as errors.
                if (response.status !== 200) {
                    throw new Error(`Received unsuccessful response status: ${response.status}`);
                }

                return response.response;
            })
            .catch((err) => {
                /* eslint-disable no-console */
                console.error('Error loading metadata:', err.toString());
                /* eslint-enable no-console */

                // Continue with default settings.
                return {};
            })
            .then((defaults) => {
                this.axes.up = defaults.upAxis || DEFAULT_AXIS_UP;
                this.axes.forward = defaults.forwardAxis || DEFAULT_AXIS_FORWARD;
                this.renderMode = defaults.defaultRenderMode || RENDER_MODE_LIT;
                this.projection = defaults.cameraProjection || CAMERA_PROJECTION_PERSPECTIVE;

                this.controls.addUi();

                if (this.axes.up !== DEFAULT_AXIS_UP || this.axes.forward !== DEFAULT_AXIS_FORWARD) {
                    this.handleRotationAxisSet(this.axes.up, this.axes.forward, false);
                }

                // Update controls ui
                this.controls.setCurrentProjectionMode(this.projection);
                this.controls.handleSetRenderMode(this.renderMode);
                this.controls.handleSetSkeletonsVisible(false);
                this.controls.handleSetWireframesVisible(false);

                // Initialize animation controls when animations are present.
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

                this.showWrapper();
                this.renderer.initVr();
                this.emit(EVENT_LOAD);
            });
    }

    /**
     * Handle animation playback (play / pause).
     * @method handleToggleAnimation
     * @private
     * @return {void}
     */
    @autobind
    handleToggleAnimation(play) {
        this.renderer.toggleAnimation(play);
    }

    /**
     * Handle canvas focus events.
     * @method handleCanvasClick
     * @private
     * @return {void}
     */
    @autobind
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
        this.handleRotationAxisSet(this.axes.up, this.axes.forward, true);
        this.controls.handleSetRenderMode(this.renderMode);
        this.controls.setCurrentProjectionMode(this.projection);

        if (this.renderer.vrEnabled) {
            const camera = this.renderer.getCamera();
            this.renderer.initCameraForVr(camera);
        }

        this.renderer.stopAnimation();
    }

    /**
     * Handle set render mode event
     * @param  {string} mode The selected render mode string
     * @return {void}
     */
    @autobind
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
    @autobind
    handleToggleHelpers(show) {
        this.renderer.toggleHelpers(show);
    }

    /**
     * Handle setting camera projection
     * @private
     * @return {void}
     */
    @autobind
    handleSetCameraProjection(projection) {
        this.renderer.setCameraProjection(projection);
    }

    /**
     * Handle setting quality level for rendering
     * @private
     * @return {void}
     */
    @autobind
    handleSetQualityLevel(level) {
        this.renderer.setQualityLevel(level);
    }

    /**
     * Handle setting skeleton visibility.
     * @private
     * @param {boolean} visible - Indicates whether or not skeletons are visible.
     * @return {void}
     */
    @autobind
    handleShowSkeletons(visible) {
        this.renderer.setSkeletonsVisible(visible);
    }

    /**
     * Handle setting wireframe visibility.
     * @private
     * @param {boolean} visible - Indicates whether or not wireframes are visible.
     * @return {void}
     */
    @autobind
    handleShowWireframes(visible) {
        this.renderer.setWireframesVisible(visible);
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Model3d = Model3d;
global.Box = Box;
export default Model3d;
