const axios = require('axios');

const SUPPORTED_LTS = "Carbon";
const VERSION = process.versions.node;
const NODE_JS_VERSION_LIST_URL="https://nodejs.org/dist/index.json"
const MIN_MAJOR_SUPPORT = 8;
const MIN_MINOR_SUPPORT = 9;
const MIN_PATCH_SUPPORT = 4;

function fail() {
    process.exit(1);
}

function pass() {
    process.exit(0);
}

/**
 * Returns true if greater or same version as minimum supported version
 *
 * @param {Number} major - Major version number
 * @param {Number} minor - Minor version number
 * @param {Number} patch - Patch version number
 * @returns {boolean} True if a supported LTS version of NodeJS
 */
function compareVersion(major, minor, patch) {
    // If major version is greater, it's valid
    if (major > MIN_MAJOR_SUPPORT) {
        return true;
    }

    // If same major supported version, and minor version is greater, it's valid
    if (major == MIN_MAJOR_SUPPORT && minor > MIN_MINOR_SUPPORT) {
        return true;
    }

    // If major and minor are supprted, and patch is greater or same, it's valid
    if (major == MIN_MAJOR_SUPPORT && minor == MIN_MINOR_SUPPORT && patch >= MIN_PATCH_SUPPORT) {
        return true;
    }

    return false;
}

/**
 * Returns an object containing major, minor, and patch numbers from a version string
 * 
 * @param {string} versionString - Version in format 'MAJ.MIN.PATCH'
 * @return {Object} with major, minor, and patch numbers
 */
function getVersionFromString(versionString) {
    const splitVersion = versionString.split('.');

    const major = parseInt(splitVersion[0]);
    const minor = parseInt(splitVersion[1]);
    const patch = parseInt(splitVersion[2]);

    return {
        major,
        minor,
        patch
    }
}

/**
 * Validates that the current version of node is valid for use.
 *
 * @param {Object} response - Axios response object
 * @returns {void}
 */
function validateNodeVersion(response) {
    // Version list comes back as an array
    const versionList = response.data;

    // Versions from NodeJS listing come in format 'vXX.XX.XX'
    const formattedVersion = `v${VERSION}`;
    
    // Make sure LTS supported version
    const isValidVersion = versionList.some((nodeRelease) => {
        const {
            version : releaseVer,
            lts
        } = nodeRelease;

        return releaseVer === formattedVersion && lts;
    });

    if (isValidVersion) {
        pass();
    } else {
        fail();
    }
}


// Split into major/minor/patch and check that it passes before
// requesting the release list from NodeJS
const { major, minor, patch } = getVersionFromString(VERSION);
if (!compareVersion(major, minor, patch)) {
    return fail();
}

axios.get(NODE_JS_VERSION_LIST_URL)
    .then(validateNodeVersion)
    .catch(fail);