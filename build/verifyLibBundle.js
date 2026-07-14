/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

// Guards against webpack emitting its chunk-loading runtime into the lib bundle.
// The runtime contains a literal `import("./" + chunkId)` expression, which downstream
// webpack builds re-parse as a context module over dist/lib/ and choke on .bin / .d.ts
// files. output.chunkLoading: false and optimization.splitChunks: false in
// webpack.config.lib.js prevent it; this check keeps that from silently regressing.
const bundlePath = path.resolve(__dirname, '../dist/lib/index.js');

if (!fs.existsSync(bundlePath)) {
    console.error(`verifyLibBundle: ${bundlePath} not found. Run yarn build:lib:js first.`);
    process.exit(1);
}

const bundle = fs.readFileSync(bundlePath, 'utf8');
const chunkLoadingPattern = /import\(\s*["']\.\/["']\s*\+/;
const match = bundle.match(chunkLoadingPattern);

if (match) {
    const line = bundle.slice(0, match.index).split('\n').length;
    console.error(
        `verifyLibBundle: dist/lib/index.js contains a chunk-loading expression at line ${line}: ${match[0]}`,
    );
    console.error(
        'The lib bundle must be self-contained. Check chunkLoading/splitChunks in build/webpack.config.lib.js.',
    );
    process.exit(1);
}

console.log('verifyLibBundle: OK, no chunk-loading runtime in dist/lib/index.js');
