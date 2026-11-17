export function isNpmBuild() {
    return typeof __BCP_NPM_BUILD__ !== 'undefined' && __BCP_NPM_BUILD__;
}
