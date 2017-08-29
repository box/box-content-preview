/* global THREE */
import autobind from 'autobind-decorator';

/** The various object manipulation modes supported. */
const controlType = {
    None: 0,
    Translation: 1,
    Scale: 2
};

/** A mapping from the control to the ID of the gamepad button that triggers it. */
const buttonMap = {
    grabObject: 1,
    grabWorld: 2
};

/**
 * This class handles the gamepad input used my the Model3D viewer while in VR mode.
 */
class Model3DVrControls {
    /** @property {Box3D.NodeObject[]} - List of vr gamepads that exist in the 3D scene */
    vrGamepads;

    /** @property {Box3D} - Instance of the Box3D runtime */
    box3d;

    /** @property {Object} - Tracks the state of controller interaction */
    controllerState;

    /** @property {number} - Used to track the initial scale distance when entering scale mode */
    initialScaleDistance = 0;

    /** @property {THREE.Vector3} - Used to track the initial scale when entering scale mode  */
    initialScale = new THREE.Vector3();

    /** @property {THREE.Vector3} - Internal worker vector, for performing Math ops */
    vrWorkVector1 = new THREE.Vector3();

    /** @property {THREE.Vector3} - Internal worker vector, for performing Math ops */
    vrWorkVector2 = new THREE.Vector3();

    /** @property {THREE.Vector3} - Internal worker vector, for performing Math ops */
    vrWorkMatrix = new THREE.Matrix4();

    /**
     * This class handles the gamepad input used my the Model3D viewer while in VR mode.
     *
     * @constructor
     * @param {Box3D.NodeObject[]} vrGamepads - List of vr gamepads that exist in the 3D scene
     * @param {Box3D} box3dEngine - Instance of the Box3D runtime
     */
    constructor(vrGamepads, box3dEngine) {
        this.vrGamepads = vrGamepads;
        this.box3d = box3dEngine;
        // Listen for gamepad button events to trigger actions.
        this.vrGamepads.forEach((gamepad) => {
            gamepad.listenTo(gamepad, 'gamepadButtonDown', this.onGamepadButtonDown.bind(this));
            gamepad.listenTo(gamepad, 'gamepadButtonUp', this.onGamepadButtonUp.bind(this));
        });
        this.controllerState = {
            initiatingController: null,
            selectedObject: null,
            previousParent: null,
            controlType: controlType.None
        };
    }

    /**
     * Unbind from all events on the gamepads and do any other needed cleanup.
     *
     * @return {void}
     */
    destroy() {
        this.vrGamepads.forEach((gamepad) => gamepad.stopListening());
    }

    /**
     * Move an object from one parent to another while maintaining the object's
     * world transform values. i.e. the size, position and scale that it appears.
     *
     * @param {Box3D.NodeObject} object - The object whose parent will be changed.
     * @param {Box3D.NodeObject} newParent - The new parent for the object.
     * @return {void}
     */
    changeParent(object, newParent) {
        const threeNewParent = newParent.runtimeData;
        const threeObject = object.runtimeData;
        if (!threeNewParent || !threeObject) {
            return;
        }

        threeObject.matrix.premultiply(threeObject.parent.matrixWorld);
        this.vrWorkMatrix.getInverse(threeNewParent.matrixWorld);
        threeObject.applyMatrix(this.vrWorkMatrix);
        object.setPosition(threeObject.position.x, threeObject.position.y, threeObject.position.z);
        object.setQuaternion(
            threeObject.quaternion.x,
            threeObject.quaternion.y,
            threeObject.quaternion.z,
            threeObject.quaternion.w
        );
        object.setScale(threeObject.scale.x, threeObject.scale.y, threeObject.scale.z);
        newParent.addChild(object);
    }

    /**
     * Start the object translation mode.
     *
     * @return {void}
     */
    startTranslation() {
        this.changeParent(this.controllerState.selectedObject, this.controllerState.initiatingController);
    }

    /**
     * End the object translation mode.
     * @return {void}
     */
    endTranslation() {
        this.changeParent(this.controllerState.selectedObject, this.controllerState.previousParent);
    }

    /**
     * Update the scale of the object each frame based on controller positions.
     *
     * @return {void}
     */
    @autobind
    onScaleUpdate() {
        this.vrGamepads[0].getPosition(this.vrWorkVector1);
        this.vrGamepads[1].getPosition(this.vrWorkVector2);
        const currentScaleDistance = this.vrWorkVector1.sub(this.vrWorkVector2).length();
        const newScale = currentScaleDistance / this.initialScaleDistance;
        this.vrWorkVector1.copy(this.initialScale).multiplyScalar(newScale);
        this.controllerState.selectedObject.setScale(this.vrWorkVector1.x, this.vrWorkVector1.y, this.vrWorkVector1.z);
    }

    /**
     * Start the object scaling mode.
     * @return {void}
     */
    startScale() {
        this.vrGamepads[0].getPosition(this.vrWorkVector1);
        this.vrGamepads[1].getPosition(this.vrWorkVector2);
        this.controllerState.selectedObject.getScale(this.initialScale);
        this.initialScaleDistance = this.vrWorkVector1.sub(this.vrWorkVector2).length();
        this.box3d.listenTo(this.box3d, 'update', this.onScaleUpdate);
    }

    /**
     * End the object scaling mode.
     *
     * @return {void}
     */
    endScale() {
        this.box3d.stopListening(this.box3d, 'update', this.onScaleUpdate);
    }

    /**
     * When the controller trigger is released, transition control modes.
     *
     * @param {Gamepad} gamepad - The Gamepad object whose button was released.
     * @param {number} buttonIdx - The ID of the button on the Gamepad.
     * @return {void}
     */
    onGamepadButtonUp(gamepad, buttonIdx) {
        if (buttonIdx !== buttonMap.grabObject) {
            return;
        }

        // If we were translating the object and a button was released, move back to doing nothing.
        if (this.controllerState.controlType === controlType.Translation) {
            this.endTranslation();
            this.controllerState.controlType = controlType.None;
            this.controllerState.selectedObject = null;
            // If we were scaling, transition back to translation.
        } else if (this.controllerState.controlType === controlType.Scale) {
            this.controllerState.controlType = controlType.Translation;
            this.endScale();
            const otherGamepad = this.vrGamepads.find((obj) => {
                const gamepadComponent = obj.getComponentByScriptId('motion_gamepad_device');
                return gamepadComponent && gamepadComponent.getGamepad() !== gamepad;
            });
            this.controllerState.initiatingController = otherGamepad;
            this.startTranslation();
        }
    }

    /**
     * When the controller trigger is pressed, transition control modes.
     *
     * @param {Gamepad} gamepad - The Gamepad object whose button was pressed.
     * @param {number} buttonIdx - The ID of the button on the Gamepad.
     * @return {void}
     */
    onGamepadButtonDown(gamepad, buttonIdx) {
        if (buttonIdx !== buttonMap.grabObject) {
            return;
        }

        // If we were translating the object, start scaling it.
        // Note that we can't be in the scaling mode as we should only have two gamepads and
        // they both should already have their triggers down to be in the scaling mode.
        if (this.controllerState.controlType === controlType.Translation) {
            this.controllerState.controlType = controlType.Scale;
            this.endTranslation();
            this.startScale();
            return;
        }

        const gamepadObject = this.vrGamepads.find((obj) => {
            const gamepadComponent = obj.getComponentByScriptId('motion_gamepad_device');
            return gamepadComponent && gamepadComponent.getGamepad() === gamepad;
        });

        // Otherwise, we have a single controller that has the potential of entering
        // translation mode.
        const controllerIntersector = gamepadObject.getComponentByScriptId('intersection_checker');
        const intersections = controllerIntersector.checkIntersection();

        let selectedPrefab;
        const intersectionIds = Object.keys(intersections);
        if (intersectionIds.length) {
            selectedPrefab = intersections[intersectionIds[0]].getInstanceTop();
        }

        if (selectedPrefab) {
            // Make sure that the selected instance isn't the other controller.
            if (this.vrGamepads.find((cont) => selectedPrefab === cont.getChild())) {
                return;
            }

            this.controllerState.controlType = controlType.Translation;
            this.controllerState.selectedObject = selectedPrefab;
            this.controllerState.previousParent = selectedPrefab.getParentObject();
            this.controllerState.initiatingController = gamepadObject;
            this.startTranslation();
        }
    }
}

export default Model3DVrControls;
