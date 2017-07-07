import Browser from '../../Browser';
/**
 * Returns the default scene entities array
 *
 * @return {Array} Array of scene entities
 */
function sceneEntities() {
    return [
        {
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
                    name: 'Preview Camera',
                    attributes: {
                        orbitDistanceMin: 0.02, // Minimum camera distance
                        orbitDistanceMax: 3, // Maximum camera distance
                        useKeyboard: false,
                        enablePan: true
                    },
                    enabled: true,
                    scriptId: 'orbit_camera'
                },
                {
                    name: 'VR Camera Controller',
                    enabled: true,
                    scriptId: 'vr_camera_controller'
                }
            ]
        },
        {
            id: 'SCENE_ID',
            type: 'scene',
            // The scene contains the lights and camera
            children: ['CAMERA_ID', 'AMBIENT_LIGHT_ID']
        },
        {
            id: 'AMBIENT_LIGHT_ID',
            type: 'light',
            parentId: 'SCENE_ID',
            properties: {
                lightType: 'ambient',
                color: { r: 0.0, g: 0.0, b: 0.0 }
            }
        },
        {
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
                            double_click: true,
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
                    name: 'VR Presenter',
                    scriptId: 'vr_presenter'
                }
            ]
        }
    ];
}

export default sceneEntities;
