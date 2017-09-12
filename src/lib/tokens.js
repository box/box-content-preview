// Create an error to throw if needed
const error = new Error('Bad Auth Token!');

/**
 * Helper function to return typed ids.
 * Token service uses typed ids but preview
 * deals with simple file ids.
 *
 * @private
 * @param {string} id - Box file ID
 * @return {Object} ID to token map
 */
function getTypedId(id) {
    return `file_${id}`;
}

/**
 * Helper function to create token map used below.
 * Maps one or more tokens to multiple files.
 *
 * @private
 * @param {Array} ids - Box file IDs
 * @param {string} [tokenOrTokens] - Single token or map
 * @return {Object} ID to token map
 */
function createIdTokenMap(ids, tokenOrTokens) {
    const tokenMap = {};
    ids.forEach((id) => {
        const typedId = getTypedId(id);
        if (!tokenOrTokens || typeof tokenOrTokens === 'string') {
            // All files use the same string or null or undefined token
            tokenMap[id] = tokenOrTokens;
        } else if (typeof tokenOrTokens === 'object' && !!tokenOrTokens[typedId]) {
            // Map typedIds and tokens to ids and tokens
            tokenMap[id] = tokenOrTokens[typedId];
        } else if (typeof tokenOrTokens === 'object' && !!tokenOrTokens[id]) {
            // This use case is only there for backwards compatibility.
            // Remove once old token service is sending back typed ids.
            tokenMap[id] = tokenOrTokens[id];
        } else {
            // We are missing requested tokens or bad token was provided
            throw error;
        }
    });
    return tokenMap;
}

/**
 * Grab the token from the saved preview options to parse it.
 * The token can either be a simple string or a function that returns
 * a promise which resolves to a key value map where key is the file
 * id and value is the token. The function accepts either a simple id
 * or an array of file ids. Tokens can also be null or undefined for
 * use cases where token is not needed to make XHRs.
 *
 * @public
 * @param {string|Array} id - box file id(s)
 * @param {string|Function} token - Token to use or token generation function
 * @return {Promise} Promise that resolves with ID to token map
 */
export default function getTokens(id, token) {
    // Throw an error when no id but allow null or undefined tokens
    if (!id) {
        return Promise.reject(error);
    }

    let ids;

    // Tokens for single or mltiple ids can be requested.
    // Normalize to an array so that we always deal with ids.
    if (Array.isArray(id)) {
        ids = id;
    } else {
        ids = [id];
    }

    if (!token || typeof token === 'string') {
        // Token is a simple string or null or undefined
        return Promise.resolve(createIdTokenMap(ids, token));
    }

    // Token is a service function that returns a promise
    // that resolves to string tokens. Token service requires
    // typed ids to be passed in to distinguish between
    // possible item types. Preview only deals with files
    // so all ids should be prefixed with file_.
    return new Promise((resolve, reject) => {
        const typedIds = ids.map((fileId) => getTypedId(fileId));
        token(typedIds).then((tokens) => {
            // Resolved tokens can either be a map of { typedId: token }
            // or it can just be a single string token that applies
            // to all the files irrespective of their id.
            try {
                resolve(createIdTokenMap(ids, tokens));
            } catch (err) {
                reject(err);
            }
        });
    });
}
