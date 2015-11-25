'use strict';
import hdrEnvDiffUrl from '../../img/model3d/hdr_env_diff.png';
import hdrEnvSpecUrl from '../../img/model3d/hdr_env_spec.png';

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
			position: {x: 49.0, y: 35.3, z: 70.3}, // Default position of camera
			quaternion: {x: -0.185, y: 0.294, z: 0.058, w: 0.936}, // Default position of camera
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
			previewCameraFocus: {
				componentData: {},
				enabled: true,
				scriptId: 'preview_camera_focus'
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
			'CAMERA_ID',
			'AMBIENT_LIGHT_ID'
		]
	}, {
		id: 'AMBIENT_LIGHT_ID',
		type: 'light',
		parentAssetId: 'SCENE_ID',
		properties: {
			type: 'AmbientLight'
		}
	}, {
		id: 'APP_ASSET_ID',
		type: 'application',
		parentAssetId: 'APP_ASSET_ID',
		properties: {
			loadStartupScene: 'SCENE_ID' // The scene to load
		},
		components: {
			veroldRenderer: {
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
	}, {
		id: 'HDR_SPEC_ENV_MAP',
		name: 'HDR Specular Env Map',
		type: 'texture2D',
		properties: {
			isLocal: true,
			isHdr: true,
			originalWidth: 1024,
			originalHeight: 512,
			ignoreStream: true
		},
		resources: [{
			path: prefix + hdrEnvSpecUrl,
			contentType: 'image/png',
			contentEncoding: 'identity',
			properties: {
				width: 1024,
				height: 512,
				compression: 'none',
				packingFormat: 'rgbe'
			}
		}]
	}, {
		id: 'HDR_DIFF_ENV_MAP',
		name: 'HDR Diffuse Env Map',
		type: 'texture2D',
		properties: {
			isLocal: true,
			isHdr: true,
			filtering: 'Linear',
			vMapping: 'Clamp',
			ignoreStream: true
		},
		resources: [{
			path: prefix + hdrEnvDiffUrl,
			contentType: 'image/png',
			contentEncoding: 'identity',
			properties: {
				width: 512,
				height: 256,
				compression: 'none',
				packingFormat: 'rgbe'
			}
		}]
	}];
}

export default sceneEntities;
