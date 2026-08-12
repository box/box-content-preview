/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

// Guards against webpack emitting its chunk-loading runtime into the lib bundle.
// The runtime contains a literal `import("./" + chunkId)` expression, which downstream
// webpack builds re-parse as a context module over dist/lib/ and choke on .bin / .d.ts
// files. output.chunkLoading: false and optimization.splitChunks: false in
// webpack.config.lib.js prevent it; this check keeps that from silently regressing.
const bundlePath = path.resolve(__dirname, '../dist/lib/index.js');
const packagePath = path.resolve(__dirname, '../package.json');
const pdfjsWorkerPath = path.resolve(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const emittedWorkerPath = path.resolve(__dirname, '../dist/lib/pdf.worker.min.mjs');

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

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const workerExport = pkg.exports['./pdf.worker.min.mjs'];

if (workerExport !== './dist/lib/pdf.worker.min.mjs') {
    console.error(
        'verifyLibBundle: package.json must export "./pdf.worker.min.mjs" as "./dist/lib/pdf.worker.min.mjs".',
    );
    process.exit(1);
}

if (!fs.existsSync(emittedWorkerPath)) {
    console.error('verifyLibBundle: dist/lib/pdf.worker.min.mjs was not emitted.');
    process.exit(1);
}

let resolvedWorkerPath;

try {
    resolvedWorkerPath = require.resolve('box-content-preview/pdf.worker.min.mjs');
} catch (error) {
    console.error('verifyLibBundle: require.resolve("box-content-preview/pdf.worker.min.mjs") failed.');
    console.error(error.message);
    process.exit(1);
}

if (resolvedWorkerPath !== emittedWorkerPath) {
    console.error(`verifyLibBundle: PDF worker resolved to ${resolvedWorkerPath}, expected ${emittedWorkerPath}.`);
    process.exit(1);
}

const pdfjsWorker = fs.readFileSync(pdfjsWorkerPath);

if (!fs.readFileSync(emittedWorkerPath).equals(pdfjsWorker)) {
    console.error('verifyLibBundle: emitted PDF worker does not match the pinned pdfjs-dist worker.');
    process.exit(1);
}

const emittedWorkerCopies = fs
    .readdirSync(path.dirname(emittedWorkerPath))
    .filter(filename => filename.endsWith('.mjs'))
    .filter(filename => fs.readFileSync(path.join(path.dirname(emittedWorkerPath), filename)).equals(pdfjsWorker));

if (emittedWorkerCopies.length !== 1 || emittedWorkerCopies[0] !== path.basename(emittedWorkerPath)) {
    console.error(`verifyLibBundle: expected one PDF worker asset, found ${emittedWorkerCopies.join(', ') || 'none'}.`);
    process.exit(1);
}

console.log('verifyLibBundle: OK, library bundle is self-contained and package exports resolve to verified assets');
