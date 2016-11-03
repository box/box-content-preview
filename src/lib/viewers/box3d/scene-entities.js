import Browser from '../../browser';
/**
 * Returns the default scene entities array for a base 3d preview. Comes with a box!
 * @returns {array} Array of scene entities
 */
function sceneEntities() {
    return [{
        id: 'CAMERA_ID',
        type: 'camera',
        parentId: 'SCENE_ROOT_ID',
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
                attributes: {
                    orbitDistanceMin: 0.02, // Minimum camera distance
                    orbitDistanceMax: 3, // Maximum camera distance
                    useKeyboard: false,
                    enablePan: true
                },
                enabled: true,
                scriptId: 'preview_camera_controller'
            },
            previewCameraFocus: {
                attributes: {},
                enabled: true,
                scriptId: 'preview_camera_focus'
            }
        }
    }, {
        id: 'SCENE_ID',
        type: 'prefab',
        properties: {
            rootObjectId: 'SCENE_ROOT_ID'
        }
    }, {
        id: 'SCENE_ROOT_ID',
        type: 'scene',
        // The scene contains the lights and camera
        children: [
            'CAMERA_ID',
            'AMBIENT_LIGHT_ID'
        ]
    }, {
        id: 'AMBIENT_LIGHT_ID',
        type: 'light',
        parentId: 'SCENE_ROOT_ID',
        properties: {
            lightType: 'ambient',
            color: { r: 0.0, g: 0.0, b: 0.0 }
        }
    }, {
        id: 'APP_ASSET_ID',
        type: 'application',
        properties: {
            startupScene: 'SCENE_ID' // The scene to load
        },
        components: {
            rendererComponent: {
                attributes: {
                    renderOnDemand: true,
                    maxTextureSize2d: Browser.isMobile() ? 1024 : undefined,
                    maxTextureSizeCube: Browser.isMobile() ? 512 : undefined,
                    preserveDrawingBuffer: false,
                    precision: Browser.isMobile() ? 'highp' : 'mediump',
                    clearAlpha: 1.0,
                    clearColor: { r: 0.95, g: 0.95, b: 0.95 }
                },
                scriptId: 'box3d_renderer',
                enabled: true
            },
            dynamicOptimizer: {
                scriptId: 'dynamic_optimizer',
                enabled: false,
                attributes: {
                    testInterval: 4000.0
                }
            },
            debugPerformance: {
                scriptId: 'debug_performance',
                enabled: false
            },
            inputController: {
                scriptId: 'input_controller_component',
                enabled: true,
                attributes: {
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
                attributes: {},
                scriptId: 'render_modes'
            }
        }
    }];
}

export default sceneEntities;
