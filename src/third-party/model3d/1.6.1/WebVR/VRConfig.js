window.WebVRConfig = {
    // Forces availability of VR mode, even for non-mobile devices.
    FORCE_ENABLE_VR: false,

    // Complementary filter coefficient. 0 for accelerometer, 1 for gyro.
    K_FILTER: 0.98,

    // How far into the future to predict during fast motion (in seconds).
    PREDICTION_TIME_S: 0.040,

    // Flag to disable touch panner. In case you have your own touch controls.
    TOUCH_PANNER_DISABLED: false,

    // Flag to disabled the UI in VR Mode.
    CARDBOARD_UI_DISABLED: false, // Default: false

    // Flag to disable the instructions to rotate your device.
    ROTATE_INSTRUCTIONS_DISABLED: false, // Default: false.

    // Enable yaw panning only, disabling roll and pitch. This can be useful
    // for panoramas with nothing interesting above or below.
    YAW_ONLY: false,

    // To disable keyboard and mouse controls, if you want to use your own
    // implementation.
    MOUSE_KEYBOARD_CONTROLS_DISABLED: true,

    // Prevent the polyfill from initializing immediately. Requires the app
    // to call InitializeWebVRPolyfill() before it can be used.
    DEFER_INITIALIZATION: false,

    // Enable the deprecated version of the API (navigator.getVRDevices).
    ENABLE_DEPRECATED_API: false,

    // Scales the recommended buffer size reported by WebVR, which can improve
    // performance.
    // UPDATE(2016-05-03): Setting this to 0.5 by default since 1.0 does not
    // perform well on many mobile devices.
    BUFFER_SCALE: 0.5,

    // Allow VRDisplay.submitFrame to change gl bindings, which is more
    // efficient if the application code will re-bind its resources on the
    // next frame anyway. This has been seen to cause rendering glitches with
    // THREE.js.
    // Dirty bindings include: gl.FRAMEBUFFER_BINDING, gl.CURRENT_PROGRAM,
    // gl.ARRAY_BUFFER_BINDING, gl.ELEMENT_ARRAY_BUFFER_BINDING,
    // and gl.TEXTURE_BINDING_2D for texture unit 0.
    DIRTY_SUBMIT_FRAME_BINDINGS: false
};
