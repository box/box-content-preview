import Browser from './Browser';
import { CLIENT_VERSION } from './util';

/**
 * Get current time in ISO format.
 *
 * @return {string} The time in ISO format.
 */
export function getISOTime() {
    return new Date().toISOString();
}

/**
 * Generates a GUID/UUID compliant with RFC4122 version 4.
 *
 * @return {string} A 36 character uuid
 */
export function uuidv4() {
    /* eslint-disable */
    function generateRandom(c) {
        const r = (Math.random() * 16) | 0;
        const v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    }
    /* eslint-enable */

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, generateRandom);
}

// Unique ID of this Preview session. Needs to be generated AFTER function def.
const PREVIEW_SESSION_ID = uuidv4();

/**
 * Get basic info about client for logging purposes.
 *
 * @return {Object} An object containging details, formatted for logging, about the preview session
 */
export function getClientLogDetails() {
    return {
        client_version: CLIENT_VERSION,
        browser_name: Browser.getName(),
        logger_session_id: PREVIEW_SESSION_ID
    };
}
