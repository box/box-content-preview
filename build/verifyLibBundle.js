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

// Resolves the package by its own name (Node self-reference goes through the exports
// map exactly like a consumer would). A CJS context matches the "default" condition;
// without it, jest, Vitest in CJS mode, and require.resolve all fail with
// "Cannot find module 'box-content-preview'".
try {
    require.resolve('box-content-preview');
} catch (error) {
    console.error('verifyLibBundle: require.resolve("box-content-preview") failed from a CJS context.');
    console.error(
        'The exports map needs a "default" condition so CJS resolvers (jest, require.resolve) can resolve the package.',
    );
    console.error(error.message);
    process.exit(1);
}

console.log('verifyLibBundle: OK, no chunk-loading runtime in dist/lib/index.js and CJS resolution works');
