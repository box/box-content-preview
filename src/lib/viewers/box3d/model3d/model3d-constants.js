// Events
export const EVENT_CANVAS_CLICK = 'canvasClick';
export const EVENT_METADATA_UPDATE_FAILURE = 'metdataUpdateFail';
export const EVENT_METADATA_UPDATE_SUCCESS = 'metdataUpdateSuccess';
export const EVENT_RESET_SKELETONS = 'resetSkeletons';
export const EVENT_ROTATE_ON_AXIS = 'rotateOnAxis';
export const EVENT_SAVE_SCENE_DEFAULTS = 'sceneSave';
export const EVENT_SELECT_ANIMATION_CLIP = 'selectAnimationClip';
export const EVENT_SET_RENDER_MODE = 'setRenderMode';
export const EVENT_SET_CAMERA_PROJECTION = 'setCameraProjection';
export const EVENT_SET_QUALITY_LEVEL = 'setQualityLevel';
export const EVENT_SET_SKELETONS_VISIBLE = 'setSkeletonsVisible';
export const EVENT_SET_WIREFRAMES_VISIBLE = 'setWireframesVisible';
export const EVENT_TOGGLE_ANIMATION = 'toggleAnimation';
export const EVENT_TOGGLE_HELPERS = 'toggleHelpers';

// 3D Scene Params
export const GRID_SECTIONS = 10;
export const GRID_SIZE = 5;
export const GRID_COLOR = 0xaaaaaa;

// CSS
export const CSS_CLASS_ANIMATION_CLIP_PULLUP = 'box3d-animation-clip-pullup';
export const CSS_CLASS_OVERLAY = 'bp-overlay-panel';
export const CSS_CLASS_PULLUP = 'bp-pullup';
export const CSS_CLASS_CURRENT_AXIS = 'bp-current-axis';
export const CSS_CLASS_SETTINGS_BUTTON = 'bp-settings-btn';
export const CSS_CLASS_PANEL_BUTTON = 'bp-panel-btn';
export const CSS_CLASS_SETTINGS_PANEL_LABEL = 'bp-settings-panel-label';
export const CSS_CLASS_SETTINGS_PANEL_SELECTOR_LABEL = 'bp-setting-selector-label';
export const CSS_CLASS_SETTINGS_PANEL_ROW = 'bp-settings-panel-row';
export const CSS_CLASS_HIDDEN = 'bp-is-hidden';

// Constants
export const AXIS_X = 'x';
export const AXIS_Y = 'y';
export const AXIS_Z = 'z';
export const CAMERA_PROJECTION_PERSPECTIVE = 'Perspective';
export const CAMERA_PROJECTION_ORTHOGRAPHIC = 'Orthographic';
export const QUALITY_LEVEL_AUTO = 'autoQuality';
export const QUALITY_LEVEL_FULL = 'fullQuality';
export const RENDER_MODE_LIT = 'Lit';
export const RENDER_MODE_UNLIT = 'Unlit';
export const RENDER_MODE_NORMALS = 'Normals';
export const RENDER_MODE_SHAPE = 'Shape';
export const RENDER_MODE_UV = 'UV Overlay';
export const ROTATION_STEP = 90;
