export default [{
    id: 'CAMERA_ID',
    type: 'camera',
    parentId: 'SCENE_ID',
    parentAssetId: 'SCENE_ID',
    properties: {
        position: {
            x: 49.0,
            y: 35.3,
            z: 70.3
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
                usePointerLock: true
            },
            enabled: true,
            scriptId: 'orbit_camera_controller'
        },
        previewVrController: {
            componentData: {},
            enabled: false,
            scriptId: 'preview_vr_controls'
        },
        vrDisplayController: {
            componentData: {},
            enabled: false,
            scriptId: 'hmd_renderer_script'
        }
    }
}, {
    id: 'SCENE_ID',
    type: 'scene',
    parentAssetId: 'SCENE_ID',
    // The scene contains the lights and camera
    children: [
        'CAMERA_ID'
    ],
    components: {
        skybox: {
            componentData: {
                size: 1000
            },
            scriptId: 'skybox_renderer'
        }
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
                antialias: true,
                renderOnDemand: false
            },
            scriptId: 'box3d_renderer',
            isBuiltIn: true,
            enabled: true
        },
        inputController: {
            scriptId: 'input_controller_component',
            isBuiltIn: true,
            enabled: true
        }
    }
}];
