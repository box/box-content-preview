import Browser from '../../browser';
/**
 * Returns the default scene entities array
 * @param  {string} prefix Prefix to be used for loading static assets
 * @returns {array} Array of scene entities
 */
function sceneEntities(prefix) {
    return [{
        id: 'CAMERA_ID',
        type: 'camera',
        parentId: 'SCENE_ID',
        parentAssetId: 'SCENE_ID',
        properties: {
            position: {
                x: -0.559,
                y: 0.197,
                z: 0.712
            }, // Default position of camera
            quaternion: {
                x: -0.101,
                y: -0.325,
                z: -0.035,
                w: 0.940
            }, // Default position of camera
            near: 0.01, // Camera near-plane distance
            far: 6
        },
        components: {
            // The render view controls how the scene is rendered: regular, UV-only, normal-only, etc.
            renderView: {
                enabled: true,
                scriptId: 'render_view_component'
            },
            // An orbit controller for rotating around the 3D model, made for preview
            previewCameraController: {
                componentData: {
                    orbitDistanceMin: 0.02, // Minimum camera distance
                    orbitDistanceMax: 3, // Maximum camera distance
                    useKeyboard: false,
                    enablePan: true
                },
                enabled: true,
                scriptId: 'preview_camera_controller'
            },
            previewCameraFocus: {
                componentData: {},
                enabled: true,
                scriptId: 'preview_camera_focus'
            }
        }
    }, {
        id: 'SCENE_ID',
        type: 'scene',
        parentAssetId: 'SCENE_ID',
        // The scene contains the lights and camera
        children: [
            'CAMERA_ID',
            'AMBIENT_LIGHT_ID'
        ]
    }, {
        id: 'AMBIENT_LIGHT_ID',
        type: 'light',
        parentAssetId: 'SCENE_ID',
        properties: {
            lightType: 'ambient'
        }
    }, {
        id: 'APP_ASSET_ID',
        type: 'application',
        parentAssetId: 'APP_ASSET_ID',
        properties: {
            startupScene: 'SCENE_ID' // The scene to load
        },
        components: {
            rendererComponent: {
                componentData: {
                    antialias: !Browser.isMobile(),
                    renderOnDemand: true,
                    maxTextureSize2d: Browser.isMobile() ? 1024 : undefined,
                    maxTextureSizeCube: Browser.isMobile() ? 512 : undefined,
                    precision: Browser.isMobile() ? 'highp' : 'mediump',
                    clearAlpha: 1.0,
                    clearColor: { r: 0.95, g: 0.95, b: 0.95 }
                },
                scriptId: 'box3d_renderer',
                enabled: true
            },
            dynamicOptimizer: {
                scriptId: 'dynamic_optimizer',
                enabled: false
            },
            debugPerformance: {
                scriptId: 'debug_performance',
                enabled: false
            },
            inputController: {
                scriptId: 'input_controller_component',
                enabled: true,
                componentData: {
                    mouseEvents: {
                        enable: true,
                        scroll: true,
                        scroll_preventDefault: true,
                        move: true,
                        down: true,
                        down_preventDefault: false,
                        up: true,
                        double_click: true,
                        leave: true,
                        contextMenu: true,
                        contextMenu_preventDefault: true,
                        dragBufferDistance: 12,
                        eventHandler: true
                    },
                    touchEvents: {
                        enable: true,
                        start: true,
                        start_preventDefault: false,
                        end: true,
                        doubleTap: true,
                        cancel: true,
                        leave: true,
                        move: true,
                        move_preventDefault: true,
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
            renderModesComponent: {
                componentData: {},
                scriptId: 'render_modes'
            }
        }
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
            width: 512,
            height: 256,
            stream: false,
            encoding: 'linear'
        },
        representations: [{
            src: `${prefix}third-party/model3d/HDR_Env1.png`,
            isExternal: true,
            contentType: 'image/png',
            contentEncoding: 'identity',
            width: 512,
            height: 256,
            compression: 'zip',
            channels: ['red', 'green', 'blue', 'exponent']
        }]
    }, {
        id: 'HDR_ENV_IMG_2',
        type: 'image',
        properties: {
            name: 'HDR Env Image 2',
            width: 256,
            height: 128,
            stream: false,
            encoding: 'linear'
        },
        representations: [{
            src: `${prefix}third-party/model3d/HDR_Env2.png`,
            isExternal: true,
            contentType: 'image/png',
            contentEncoding: 'identity',
            width: 256,
            height: 128,
            compression: 'zip',
            channels: ['red', 'green', 'blue', 'exponent']
        }]
    }, {
        id: 'HDR_ENV_MAP_0',
        type: 'texture2D',
        properties: {
            imageId: 'HDR_ENV_IMG_0',
            name: 'HDR Env Map 0',
            type: 'halfFloat',
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
            type: 'halfFloat',
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
            type: 'halfFloat',
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
            type: 'halfFloat',
            width: 512,
            height: 512,
            generateMipmaps: true,
            vMapping: 'clamp',
            uMapping: 'clamp'
        },
        components: {
            equirectToCubemap: {
                scriptId: 'panorama_to_cubemap_script',
                enabled: true,
                componentData: {
                    inputTexture: 'HDR_ENV_MAP_0'
                }
            }
        }
    }, {
        id: 'HDR_ENV_MAP_CUBE_1',
        type: 'renderTextureCube',
        properties: {
            name: 'HDR Cube Env Map 1',
            type: 'halfFloat',
            width: 256,
            height: 256,
            generateMipmaps: true,
            vMapping: 'clamp',
            uMapping: 'clamp'
        },
        components: {
            equirectToCubemap: {
                scriptId: 'panorama_to_cubemap_script',
                enabled: true,
                componentData: {
                    inputTexture: 'HDR_ENV_MAP_1'
                }
            }
        }
    }, {
        id: 'HDR_ENV_MAP_CUBE_2',
        type: 'renderTextureCube',
        properties: {
            name: 'HDR Cube Env Map 2',
            type: 'halfFloat',
            width: 128,
            height: 128,
            generateMipmaps: true,
            vMapping: 'clamp',
            uMapping: 'clamp'
        },
        components: {
            equirectToCubemap: {
                scriptId: 'panorama_to_cubemap_script',
                enabled: true,
                componentData: {
                    inputTexture: 'HDR_ENV_MAP_2'
                }
            }
        }
    }];
}

export default sceneEntities;
