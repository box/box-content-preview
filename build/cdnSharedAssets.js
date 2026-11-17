const path = require('path');

const dist = path.resolve('dist');
const pdfjsDist = path.resolve('node_modules/pdfjs-dist');

// [source, destination] rsync pairs for CDN files that every locale shares.
// webpack.config.js copies them on the first config of a multi-locale build;
// buildLocaleAssets.js copies them once before its per-locale processes.
module.exports = [
    [path.resolve('src/third-party'), dist],
    [path.resolve('src/lib/exif'), dist],
    [path.join(pdfjsDist, 'cmaps'), dist],
    [path.join(pdfjsDist, 'iccs'), dist],
    [path.join(pdfjsDist, 'standard_fonts'), dist],
    [path.join(pdfjsDist, 'wasm'), dist],
    // The trailing slash copies the folder's contents rather than the folder.
    [`${path.join(pdfjsDist, 'legacy/web/images')}/`, path.join(dist, 'pdfjs-images')],
];
