import Browser from '../../../Browser';
import { MODEL3D_STATIC_ASSETS_VERSION } from '../../../constants';

/**
 * Returns the default scene entities array
 * @param  {string} prefix Prefix to be used for loading static assets
 * @return {array} Array of scene entities
 */
function sceneEntities(prefix) {
    return [{
        id: 'CAMERA_ID',
        type: 'camera',
        parentId: 'SCENE_ID',
        properties: {
            near: 0.01, // Camera near-plane distance
            far: 100
        },
        components: [
            // The render view controls how the scene is rendered: regular, UV-only, normal-only, etc.
            {
                name: 'Render View',
                enabled: true,
                scriptId: 'vr_render_view'
            },
            // An orbit controller for rotating around the 3D model, made for preview
            {
                name: 'Orbit Camera',
                attributes: {
                    zoomPerspectiveBounds: { x: 0.02, y: 90 },
                    useKeyboard: false,
                    enablePan: true
                },
                enabled: true,
                scriptId: 'orbit_camera'
            },
            {
                name: 'Orbit Camera Focus',
                attributes: {},
                enabled: true,
                scriptId: 'orbit_camera_focus'
            },
            {
                name: 'VR Camera Controller',
                enabled: true,
                scriptId: 'vr_camera_controller'
            }
        ]
    }, {
        id: 'SCENE_ID',
        type: 'scene',
        // The scene contains the lights and camera
        children: [
            'CAMERA_ID',
            'AMBIENT_LIGHT_ID',
            'DIRECTIONAL_LIGHT_1_ID',
            'DIRECTIONAL_LIGHT_2_ID'
        ]
    }, {
        id: 'AMBIENT_LIGHT_ID',
        type: 'light',
        parentId: 'SCENE_ID',
        properties: {
            lightType: 'ambient',
            color: { r: 1, g: 1, b: 1 }
        }
    }, {
        id: 'DIRECTIONAL_LIGHT_1_ID',
        type: 'light',
        parentId: 'SCENE_ID',
        properties: {
            lightType: 'directional',
            name: 'Key Light',
            position: { x: -3, y: 3, z: 2 },
            color: { r: 1, g: 1, b: 0.85 },
            intensity: 2
        }
    }, {
        id: 'DIRECTIONAL_LIGHT_2_ID',
        type: 'light',
        parentId: 'SCENE_ID',
        properties: {
            lightType: 'directional',
            name: 'Back Light',
            position: { x: 3, y: 2, z: -2 },
            color: { r: 0.75, g: 0.75, b: 1 },
            intensity: 1.5
        }
    }, {
        id: 'APP_ASSET_ID',
        type: 'application',
        properties: {
            startupSceneId: 'SCENE_ID' // The scene to load
        },
        components: [
            {
                name: 'Renderer',
                attributes: {
                    renderOnDemand: true,
                    maxTextureSize2d: Browser.isMobile() ? 1024 : 8192,
                    maxTextureSizeCube: Browser.isMobile() ? 512 : undefined,
                    preserveDrawingBuffer: false,
                    precision: Browser.isMobile() ? 'highp' : 'mediump',
                    clearAlpha: 1.0,
                    clearColor: { r: 0.95, g: 0.95, b: 0.95 }
                },
                scriptId: 'box3d_renderer',
                enabled: true
            },
            {
                name: 'Dynamic Optimizer',
                scriptId: 'dynamic_optimizer',
                enabled: false,
                attributes: {
                    testInterval: 4000.0
                }
            },
            {
                name: 'Debug Performance',
                scriptId: 'debug_performance',
                enabled: false
            },
            {
                name: 'Input',
                scriptId: 'input',
                enabled: true,
                attributes: {
                    mouseEvents: {
                        enable: true,
                        scroll: true,
                        preventScrollDefault: true,
                        move: true,
                        down: true,
                        preventDownDefault: false,
                        up: true,
                        doubleClick: true,
                        leave: true,
                        contextMenu: true,
                        preventContextMenuDefault: true,
                        dragBufferDistance: 12,
                        eventHandler: true
                    },
                    touchEvents: {
                        enable: true,
                        start: true,
                        preventStartDefault: false,
                        end: true,
                        doubleTap: true,
                        cancel: true,
                        leave: true,
                        move: true,
                        preventMoveDefault: true,
                        dragBufferDistance: 12,
                        eventHandler: true
                    },
                    keyEvents: {
                        enable: true,
                        down: true,
                        up: true,
                        preventDefault: false,
                        eventHandler: true
                    }
                }
            },
            {
                name: 'Render Modes',
                attributes: {},
                scriptId: 'render_modes'
            },
            {
                name: 'VR Presenter',
                scriptId: 'vr_presenter'
            }
        ]
    }, {
        id: 'MAT_CAP_TEX',
        type: 'texture2D',
        properties: {
            name: 'Mat Cap Texture',
            imageId: 'MAT_CAP_IMG',
            wrapModeU: 'clampToEdge',
            wrapModeV: 'clampToEdge'
        }
    }, {
        id: 'MAT_CAP_IMG',
        type: 'image',
        properties: {
            name: 'Mat Cap Image',
            width: 256,
            height: 256,
            stream: false
        },
        representations: [{
            src: `${prefix}third-party/model3d/${MODEL3D_STATIC_ASSETS_VERSION}/matcap.png`,
            isExternal: true,
            contentType: 'image/png',
            contentEncoding: 'identity',
            width: 256,
            height: 256,
            compression: 'zip'
        }]
    }];
}

export default sceneEntities;
