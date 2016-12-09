import Browser from '../../../browser';

export default [{
    id: 'CAMERA_ID',
    type: 'camera',
    parentId: 'SCENE_ID',
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
    components: [
        // The render view controls how the scene is rendered: regular, UV-only, normal-only, etc.
        {
            name: 'Render View',
            enabled: true,
            scriptId: 'render_view_component'
        },
        {
            name: 'Orbit Camera',
            attributes: {
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
    ]
}, {
    id: 'SCENE_ID',
    type: 'scene',
    // The scene contains the lights and camera
    children: [
        'CAMERA_ID'
    ],
    components: [
        {
            name: 'Skybox',
            attributes: {
                size: 100
            },
            scriptId: 'skybox_renderer',
            enabled: false
        }
    ]
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
                antialias: !Browser.isMobile(),
                maxTextureSize2d: 8192,
                renderOnDemand: true
            },
            scriptId: 'box3d_renderer',
            isBuiltIn: true,
            enabled: true
        },
        {
            name: 'Debug Performance',
            scriptId: 'debug_performance',
            enabled: false
        },
        {
            name: 'Input',
            scriptId: 'input_controller_component',
            isBuiltIn: true,
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
        }
    ]
}];
