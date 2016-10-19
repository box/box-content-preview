import Browser from '../../../browser';

export default [{
    id: 'CAMERA_ID',
    type: 'camera',
    parentId: 'SCENE_ROOT_ID',
    properties: {
        position: {
            x: 0.0,
            y: 0.0,
            z: 0.0
        }, // Default position of camera
        quaternion: {
            x: -0.185,
            y: 0.294,
            z: 0.058,
            w: 0.936
        }, // Default position of camera
        near: 10, // Camera near-plane distance
        far: 1200,
        fov: 70
    },
    components: {
        // The render view controls how the scene is rendered: regular, UV-only, normal-only, etc.
        renderView: {
            enabled: true,
            scriptId: 'render_view_component'
        },
        orbit_camera_controller: {
            componentData: {
                enablePan: false,
                enableZoom: false,
                inertialDamping: 0.2,
                invertX: true,
                invertY: true,
                lookSpeed: 0.5
            },
            enabled: true,
            scriptId: 'orbit_camera_controller'
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
        'CAMERA_ID'
    ],
    components: {
        skybox: {
            componentData: {
                size: 100
            },
            scriptId: 'skybox_renderer',
            enabled: false
        }
    }
}, {
    id: 'APP_ASSET_ID',
    type: 'application',
    properties: {
        startupScene: 'SCENE_ID' // The scene to load
    },
    components: {
        rendererComponent: {
            componentData: {
                antialias: !Browser.isMobile(),
                renderOnDemand: true
            },
            scriptId: 'box3d_renderer',
            isBuiltIn: true,
            enabled: true
        },
        debugPerformance: {
            scriptId: 'debug_performance',
            enabled: false
        },
        inputController: {
            scriptId: 'input_controller_component',
            isBuiltIn: true,
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
        }
    }
}];
