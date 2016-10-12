/**
 * Returns the default scene entities array for a base 3d preview. Comes with a box!
 * @returns {array} Array of scene entities
 */
function sceneEntities() {
    return [{
        id: 'CAMERA_ID',
        type: 'camera',
        parentId: 'SCENE_ROOT_ID',
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
            near: 1, // Camera near-plane distance
            far: 600
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
                    orbitDistanceMin: 2, // Minimum camera distance
                    orbitDistanceMax: 300, // Maximum camera distance
                    useKeyboard: false,
                    enablePan: true
                },
                enabled: true,
                scriptId: 'preview_camera_controller'
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
        properties: {
            rootObjectId: 'SCENE_ROOT_ID'
        }
    }, {
        id: 'SCENE_ROOT_ID',
        type: 'node',
        parentAssetId: 'SCENE_ID',
        // The scene contains the lights and camera
        children: [
            'CAMERA_ID',
            'AMBIENT_LIGHT_ID'
        ]
    }, {
        id: 'AMBIENT_LIGHT_ID',
        type: 'light',
        parentAssetId: 'SCENE_ROOT_ID',
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
                    antialias: true
                },
                scriptId: 'box3d_renderer',
                isBuiltIn: true,
                enabled: true
            },
            inputController: {
                scriptId: 'input_controller_component',
                isBuiltIn: true,
                enabled: true
            },
            renderModesComponent: {
                componentData: {},
                scriptId: 'render_modes'
            }
        }
    }];
}

export default sceneEntities;
