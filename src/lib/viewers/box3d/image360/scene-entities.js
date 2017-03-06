import Browser from '../../../Browser';

export default [{
    id: 'CAMERA_ID',
    type: 'camera',
    parentId: 'SCENE_ID',
    properties: {
        near: 0.05, // Camera near-plane distance
        far: 200,
        fov: 70
    },
    components: [
        // The render view controls how the scene is rendered: regular, UV-only, normal-only, etc.
        {
            name: 'Render View',
            enabled: true,
            scriptId: 'vr_render_view'
        },
        {
            name: 'Orbit Camera',
            attributes: {
                panEnabled: false,
                zoomEnabled: false,
                inertialDamping: 0.2,
                lookSpeed: 0.5
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
                maxTextureSize2d: 4096,
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
            scriptId: 'input',
            isBuiltIn: true,
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
            name: 'VR Presenter',
            scriptId: 'vr_presenter'
        }
    ]
}];
