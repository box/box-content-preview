import { MODEL3D_STATIC_ASSETS_VERSION } from '../../../constants';

/**
 * Returns the default scene entities array
 *
 * @param {string} prefix - Prefix to be used for loading static assets
 * @return {Array} Array of scene entities
 */
function sceneEntities(prefix) {
    return [
        {
            id: 'MAT_CAP_TEX',
            type: 'texture2D',
            properties: {
                name: 'Mat Cap Texture',
                imageId: 'MAT_CAP_IMG',
                wrapModeU: 'clampToEdge',
                wrapModeV: 'clampToEdge',
                flipY: true
            }
        },
        {
            id: 'MAT_CAP_IMG',
            type: 'image',
            properties: {
                name: 'Mat Cap Image',
                width: 256,
                height: 256,
                stream: false
            },
            representations: [
                {
                    src: `${prefix}third-party/model3d/${MODEL3D_STATIC_ASSETS_VERSION}/matcap.png`,
                    isExternal: true,
                    contentType: 'image/png',
                    contentEncoding: 'identity',
                    width: 256,
                    height: 256,
                    compression: 'zip'
                }
            ]
        }
    ];
}

export default sceneEntities;
