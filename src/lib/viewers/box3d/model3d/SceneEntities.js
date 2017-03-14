import Browser from '../../../Browser';
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
            'AMBIENT_LIGHT_ID'
        ],
        components: [
            {
                name: 'Light Environment',
                attributes: {
                    irradianceMap: 'HDR_ENV_MAP_CUBE_2',
                    radianceMapHalfGloss: 'HDR_ENV_MAP_CUBE_1',
                    radianceMap: 'HDR_ENV_MAP_CUBE_0'
                },
                scriptId: 'light_environment'
            }
        ]
    }, {
        id: 'AMBIENT_LIGHT_ID',
        type: 'light',
        parentId: 'SCENE_ID',
        properties: {
            lightType: 'ambient',
            color: { r: 0.0, g: 0.0, b: 0.0 }
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
            uMapping: 'clamp',
            vMapping: 'clamp'
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
            src: `${prefix}third-party/model3d/matcap.png`,
            isExternal: true,
            contentType: 'image/png',
            contentEncoding: 'identity',
            width: 256,
            height: 256,
            compression: 'zip'
        }]
    }, {
        id: 'HDR_ENV_IMG_0',
        type: 'image',
        properties: {
            name: 'HDR Env Image 0',
            width: 1024,
            height: 512,
            stream: false,
            encoding: 'linear'
        },
        representations: [{
            src: `${prefix}third-party/model3d/HDR_Env0.png`,
            isExternal: true,
            contentType: 'image/png',
            contentEncoding: 'identity',
            width: 1024,
            height: 512,
            compression: 'zip',
            channels: ['red', 'green', 'blue', 'exponent']
        }]
    }, {
        id: 'HDR_ENV_IMG_1',
        type: 'image',
        properties: {
            name: 'HDR Env Image 1',
            width: 256,
            height: 128,
            stream: false,
            encoding: 'linear'
        },
        representations: [{
            src: `${prefix}third-party/model3d/HDR_Env1.png`,
            isExternal: true,
            contentType: 'image/png',
            contentEncoding: 'identity',
            width: 256,
            height: 128,
            compression: 'zip',
            channels: ['red', 'green', 'blue', 'exponent']
        }]
    }, {
        id: 'HDR_ENV_IMG_2',
        type: 'image',
        properties: {
            name: 'HDR Env Image 2',
            width: 64,
            height: 32,
            stream: false,
            encoding: 'linear'
        },
        representations: [{
            src: `${prefix}third-party/model3d/HDR_Env2.png`,
            isExternal: true,
            contentType: 'image/png',
            contentEncoding: 'identity',
            width: 64,
            height: 32,
            compression: 'zip',
            channels: ['red', 'green', 'blue', 'exponent']
        }]
    }, {
        id: 'HDR_ENV_MAP_0',
        type: 'texture2D',
        properties: {
            imageId: 'HDR_ENV_IMG_0',
            name: 'HDR Env Map 0',
            type: Browser.isAndroid() ? 'uByte' : 'halfFloat',
            minFilter: 'linear',
            magFilter: 'linear',
            vMapping: 'clamp',
            generateMipmaps: false
        }
    }, {
        id: 'HDR_ENV_MAP_1',
        type: 'texture2D',
        properties: {
            imageId: 'HDR_ENV_IMG_1',
            name: 'HDR Env Map 1',
            type: Browser.isAndroid() ? 'uByte' : 'halfFloat',
            minFilter: 'linear',
            magFilter: 'linear',
            vMapping: 'clamp',
            generateMipmaps: false
        }
    }, {
        id: 'HDR_ENV_MAP_2',
        type: 'texture2D',
        properties: {
            imageId: 'HDR_ENV_IMG_2',
            name: 'HDR Env Map 2',
            type: Browser.isAndroid() ? 'uByte' : 'halfFloat',
            minFilter: 'linear',
            magFilter: 'linear',
            vMapping: 'clamp',
            generateMipmaps: false
        }
    }, {
        id: 'HDR_ENV_MAP_CUBE_0',
        type: 'renderTextureCube',
        properties: {
            name: 'HDR Cube Env Map 0',
            type: Browser.isAndroid() ? 'uByte' : 'halfFloat',
            width: 512,
            height: 512,
            generateMipmaps: true,
            vMapping: 'clamp',
            uMapping: 'clamp',
            encoding: 'linear'
        },
        components: [
            {
                name: 'Convert Panorama To CubeMap',
                scriptId: 'panorama_to_cube_map',
                enabled: true,
                attributes: {
                    inputTexture: 'HDR_ENV_MAP_0'
                }
            }
        ]
    }, {
        id: 'HDR_ENV_MAP_CUBE_1',
        type: 'renderTextureCube',
        properties: {
            name: 'HDR Cube Env Map 1',
            type: Browser.isAndroid() ? 'uByte' : 'halfFloat',
            width: 256,
            height: 256,
            generateMipmaps: true,
            vMapping: 'clamp',
            uMapping: 'clamp',
            encoding: 'linear'
        },
        components: [
            {
                name: 'Convert Panorama To CubeMap',
                scriptId: 'panorama_to_cube_map',
                enabled: true,
                attributes: {
                    inputTexture: 'HDR_ENV_MAP_1'
                }
            }
        ]
    }, {
        id: 'HDR_ENV_MAP_CUBE_2',
        type: 'renderTextureCube',
        properties: {
            name: 'HDR Cube Env Map 2',
            type: Browser.isAndroid() ? 'uByte' : 'halfFloat',
            width: 128,
            height: 128,
            generateMipmaps: true,
            vMapping: 'clamp',
            uMapping: 'clamp',
            encoding: 'linear'
        },
        components: [
            {
                name: 'Convert Panorama To CubeMap',
                scriptId: 'panorama_to_cube_map',
                enabled: true,
                attributes: {
                    inputTexture: 'HDR_ENV_MAP_2'
                }
            }
        ]
    }];
}

export default sceneEntities;
