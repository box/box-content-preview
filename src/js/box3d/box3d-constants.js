'use strict';
// All 3D previews come with base functionality for enabling VR, enabling fullscreen
// mode, and resetting the camera orientation
// EVENTS
export const EVENT_DISABLE_VR = 'disableVr';
export const EVENT_ENABLE_VR = 'enableVr';
export const EVENT_ENTER_FULLSCREEN = 'enterfullscreen';
export const EVENT_ERROR = 'error';
export const EVENT_EXIT_FULLSCREEN = 'exitfullscreen';
export const EVENT_LOAD = 'load';
export const EVENT_RESET = 'reset';
export const EVENT_RESET_SCENE_DEFAULTS = 'sceneReset';
export const EVENT_SCENE_LOADED = 'sceneLoaded';
export const EVENT_SHOW_VR_BUTTON = 'showVrButton';
export const EVENT_TOGGLE_FULLSCREEN = 'toggleFullscreen';
export const EVENT_TRIGGER_RENDER = 'triggerRender';

// CSS CLASSES
export const CSS_CLASS_BOX3D = 'box-preview-box3d';
export const CSS_CLASS_HIDDEN = 'hidden';

// OTHER CONSTANT VARIABLES
export const CACHE_KEY_BOX3D = 'box3d';
