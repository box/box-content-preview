/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Gzipped size budgets for dist/lib/index.js and dist/lib/index.css.
// Runtime metrics start after this chunk loads, so they cannot see the npm
// bundle grow — including when @box/blueprint-web or @box/blueprint-web-assets
// gets inlined instead of staying external.
//
// Baseline on master 3.139.0, measured with zlib.gzipSync (default compression):
//   index.js  — 747,837 bytes (730.3 KiB)
//   index.css — 46,437 bytes (45.3 KiB)
//
// Each budget is 5% above that baseline, rounded up to the next KiB (1024 bytes):
//   index.js  — 785,408 bytes (767 KiB), 37,571 bytes of headroom
//   index.css — 49,152 bytes (48 KiB), 2,715 bytes of headroom
//
// Raise the constant in the same change that pushes a file past this headroom.
const LIB_GZIP_BUDGET_BYTES = {
    'index.js': 785408,
    'index.css': 49152,
};

const BLUEPRINT_PACKAGES = ['@box/blueprint-web', '@box/blueprint-web-assets'];
const libWebpackConfig = require('./webpack.config.lib');

// Sass and css-loader inline imported stylesheets, and the lib production build does not
// emit mini-css-extract path comments, so dist/lib/index.css will not contain
// node_modules/@box/blueprint-web even when those styles were compiled in.
const LIB_ENTRY = path.resolve(__dirname, '../src/index.ts');
const SRC_ROOT = path.resolve(__dirname, '../src');
const SCRIPT_EXTENSIONS = ['.tsx', '.ts', '.js', '.jsx'];
const STYLE_EXTENSIONS = ['.scss', '.css', '.sass'];

// Guards against webpack emitting its chunk-loading runtime into the lib bundle.
// The runtime contains a literal `import("./" + chunkId)` expression, which downstream
// webpack builds re-parse as a context module over dist/lib/ and choke on .bin / .d.ts
// files. output.chunkLoading: false and optimization.splitChunks: false in
// webpack.config.lib.js prevent it; this check keeps that from silently regressing.
const bundlePath = path.resolve(__dirname, '../dist/lib/index.js');
const packagePath = path.resolve(__dirname, '../package.json');
const pdfjsWorkerPath = path.resolve(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs');
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

// Hosts merge these files into their language bundles (see build/buildLibI18n.js).
// Bundlers import them without an extension; @box/frontend's buildLanguageBundles
// resolves them with ".js" appended, so both specifiers must resolve.
const i18nSourceDir = path.resolve(__dirname, '../src/i18n/json');
const expectedLocales = fs
    .readdirSync(i18nSourceDir)
    .filter(filename => filename.endsWith('.json'))
    .map(filename => path.basename(filename, '.json'));

expectedLocales.forEach(locale => {
    const localePath = path.resolve(__dirname, `../dist/lib/i18n/${locale}.js`);

    [`box-content-preview/i18n/${locale}`, `box-content-preview/i18n/${locale}.js`].forEach(specifier => {
        let resolvedPath;

        try {
            resolvedPath = require.resolve(specifier);
        } catch (error) {
            console.error(`verifyLibBundle: require.resolve("${specifier}") failed.`);
            console.error(error.message);
            process.exit(1);
        }

        if (resolvedPath !== localePath) {
            console.error(`verifyLibBundle: ${specifier} resolved to ${resolvedPath}, expected ${localePath}.`);
            process.exit(1);
        }
    });

    if (!fs.readFileSync(localePath, 'utf8').includes('"bcp.')) {
        console.error(`verifyLibBundle: ${localePath} has no "bcp."-prefixed messages.`);
        process.exit(1);
    }
});

function containsNonEmptyFile(dirPath) {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        return false;
    }

    return fs.readdirSync(dirPath).some(entry => {
        const entryPath = path.join(dirPath, entry);
        const stat = fs.statSync(entryPath);

        if (stat.isDirectory()) {
            return containsNonEmptyFile(entryPath);
        }

        return stat.isFile() && stat.size > 0;
    });
}

['wasm', 'cmaps', 'iccs', 'standard_fonts', 'pdfjs-images', 'exif', 'third-party'].forEach(assetName => {
    const assetDir = path.resolve(__dirname, '../dist/lib', assetName);

    if (!containsNonEmptyFile(assetDir)) {
        console.error(`verifyLibBundle: dist/lib/${assetName} is missing or empty.`);
        process.exit(1);
    }
});

function formatByteCount(bytes, signed = false) {
    const sign = signed && bytes > 0 ? '+' : '';
    return `${sign}${bytes} bytes (${sign}${(bytes / 1024).toFixed(1)} KiB)`;
}

function externalImportPattern(packageName) {
    const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(
        `^import\\s+(?:["']${escaped}(?:/[^"']*)?["']|.+\\sfrom\\s+["']${escaped}(?:/[^"']*)?["']);?\\s*$`,
        'm',
    );
}

function inlinedBlueprintPackages(source) {
    return new Set(
        [...source.matchAll(/node_modules\/(@box\/blueprint-web(?:-assets)?)\//g)].map(found => found[1]),
    );
}

function libCssIncludePaths() {
    const cssRule = libWebpackConfig.module.rules.find(
        rule => rule.test && rule.test.test('preview.scss') && rule.include,
    );

    if (!cssRule) {
        console.error('verifyLibBundle: build/webpack.config.lib.js has no CSS rule with an include list.');
        process.exit(1);
    }

    return [].concat(cssRule.include);
}

function isInsideBlueprintPackage(filePath) {
    const resolved = path.resolve(filePath);

    return BLUEPRINT_PACKAGES.some(packageName => {
        const packageDir = path.resolve(__dirname, '../node_modules', packageName);
        return resolved === packageDir || resolved.startsWith(`${packageDir}${path.sep}`);
    });
}

function stripComments(source) {
    return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^\S\n])\/\/.*$/gm, '$1');
}

function blueprintPackageFromRequest(request) {
    return BLUEPRINT_PACKAGES.find(
        packageName => request === packageName || request.startsWith(`${packageName}/`),
    );
}

// Any quoted specifier on the directive counts. `@import "local", "@box/blueprint-web/styles"`
// would otherwise hide the Blueprint path in the second specifier. Comments are removed
// first because Sass ignores `// @use "..."`.
function blueprintStylePackage(source) {
    const stripped = stripComments(source);
    let found = null;

    [...stripped.matchAll(/@(?:import|use|forward)\b([^;]*);/g)].some(directive => {
        const hit = [...directive[1].matchAll(/['"]~?([^'"]+)['"]/g)].find(specifier =>
            blueprintPackageFromRequest(specifier[1]),
        );

        if (hit) {
            found = blueprintPackageFromRequest(hit[1]);
        }

        return Boolean(hit);
    });

    return found;
}

function existingFile(candidate) {
    return fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : null;
}

function resolveWithExtensions(basePath, extensions) {
    const exact = existingFile(basePath);

    if (exact) {
        return exact;
    }

    const parsed = path.parse(basePath);
    const partialBase = path.join(parsed.dir, `_${parsed.base}`);
    const candidates = [];

    extensions.forEach(extension => {
        candidates.push(`${basePath}${extension}`);
        candidates.push(`${partialBase}${extension}`);
    });
    candidates.push(path.join(basePath, 'index.scss'), path.join(basePath, '_index.scss'));
    SCRIPT_EXTENSIONS.forEach(extension => {
        candidates.push(path.join(basePath, `index${extension}`));
    });

    return candidates.map(existingFile).find(Boolean) || null;
}

function resolveRequest(specifier, fromFile) {
    if (specifier.startsWith('.')) {
        return resolveWithExtensions(path.resolve(path.dirname(fromFile), specifier), [
            ...SCRIPT_EXTENSIONS,
            ...STYLE_EXTENSIONS,
        ]);
    }

    const bareBases = [
        path.resolve(path.dirname(fromFile), specifier),
        path.resolve(SRC_ROOT, specifier),
        path.resolve(__dirname, '../node_modules', specifier),
    ];

    return (
        bareBases
            .map(basePath => resolveWithExtensions(basePath, [...SCRIPT_EXTENSIONS, ...STYLE_EXTENSIONS]))
            .find(Boolean) || null
    );
}

function requestsIn(source) {
    const stripped = stripComments(source);
    const requests = [];

    [...stripped.matchAll(/(?:import|export)\s+(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/g)].forEach(found => {
        requests.push(found[1]);
    });
    [...stripped.matchAll(/@(?:import|use|forward)\b([^;]*);/g)].forEach(directive => {
        [...directive[1].matchAll(/['"]~?([^'"]+)['"]/g)].forEach(specifier => {
            requests.push(specifier[1]);
        });
    });

    return requests;
}

function isInsideRoot(filePath, root) {
    const resolvedRoot = path.resolve(root);
    return filePath === resolvedRoot || filePath.startsWith(`${resolvedRoot}${path.sep}`);
}

// Include paths are not compilation inputs. Only stylesheets reachable from the lib entry
// are compiled, so an unimported file under src/lib must not fail the build.
function reachableStylesheets(includePaths) {
    const roots = [SRC_ROOT, ...includePaths.map(includePath => path.resolve(includePath))];
    const seen = new Set();
    const styles = new Set();
    const queue = [LIB_ENTRY];

    while (queue.length > 0) {
        const filePath = queue.pop();

        if (filePath && !seen.has(filePath)) {
            seen.add(filePath);

            requestsIn(fs.readFileSync(filePath, 'utf8')).forEach(specifier => {
                const resolved = resolveRequest(specifier, filePath);

                if (!resolved || seen.has(resolved)) {
                    return;
                }

                if (STYLE_EXTENSIONS.some(extension => resolved.endsWith(extension))) {
                    if (includePaths.some(includePath => isInsideRoot(resolved, includePath))) {
                        styles.add(resolved);
                    }

                    queue.push(resolved);
                    return;
                }

                if (roots.some(root => isInsideRoot(resolved, root))) {
                    queue.push(resolved);
                }
            });
        }
    }

    return [...styles];
}

function assertBlueprintStylesStayExternal() {
    const includePaths = libCssIncludePaths();
    const bundledPackage = includePaths.find(includePath => isInsideBlueprintPackage(includePath));

    if (bundledPackage) {
        console.error(
            `verifyLibBundle: the lib CSS rule compiles ${bundledPackage}. Remove @box/blueprint-web and @box/blueprint-web-assets from that include list so the host supplies those styles.`,
        );
        process.exit(1);
    }

    reachableStylesheets(includePaths).forEach(stylesheetPath => {
        const stylePackage = blueprintStylePackage(fs.readFileSync(stylesheetPath, 'utf8'));

        if (stylePackage) {
            const relativePath = path.relative(path.resolve(__dirname, '..'), stylesheetPath);
            console.error(
                `verifyLibBundle: ${relativePath} imports ${stylePackage}. Sass and css-loader would inline that stylesheet into dist/lib/index.css.`,
            );
            console.error('Keep Blueprint styles external. The host already provides them.');
            process.exit(1);
        }
    });
}

function assertBlueprintStaysExternal(jsSource) {
    const missing = BLUEPRINT_PACKAGES.filter(packageName => !externalImportPattern(packageName).test(jsSource));

    if (missing.length > 0) {
        console.error(
            `verifyLibBundle: dist/lib/index.js is missing an external import of ${missing.join(' and ')}.`,
        );
        console.error(
            'Blueprint packages must be imported from @box/blueprint-web and @box/blueprint-web-assets, not bundled into the lib.',
        );
        process.exit(1);
    }

    const inlined = [...inlinedBlueprintPackages(jsSource)];

    if (inlined.length > 0) {
        console.error(`verifyLibBundle: dist/lib/index.js contains inlined ${inlined.join(' and ')} source.`);
        console.error(
            'Keep these packages in externals in build/webpack.config.lib.js so the bundle imports them instead of inlining their source.',
        );
        process.exit(1);
    }

    assertBlueprintStylesStayExternal();
}

function reportGzipBudgets() {
    const failures = [];

    Object.entries(LIB_GZIP_BUDGET_BYTES).forEach(([filename, budget]) => {
        const filePath = path.resolve(__dirname, '../dist/lib', filename);

        if (!fs.existsSync(filePath)) {
            console.error(`verifyLibBundle: ${filePath} not found. Run yarn build:lib:js first.`);
            process.exit(1);
        }

        const size = zlib.gzipSync(fs.readFileSync(filePath)).length;
        const delta = size - budget;

        console.log(
            `verifyLibBundle: dist/lib/${filename} gzipped ${formatByteCount(size)}, budget ${formatByteCount(
                budget,
            )}, delta ${formatByteCount(delta, true)}`,
        );

        if (size > budget) {
            failures.push(`dist/lib/${filename}`);
        }
    });

    if (failures.length > 0) {
        const summary =
            failures.length === 1
                ? `gzipped ${failures[0]} exceeds its budget`
                : `gzipped ${failures.join(' and ')} exceed their budgets`;

        console.error(
            `verifyLibBundle: ${summary}. Raise LIB_GZIP_BUDGET_BYTES in the same change that grows the bundle.`,
        );
        process.exit(1);
    }
}

const cssPath = path.resolve(__dirname, '../dist/lib/index.css');

if (!fs.existsSync(cssPath)) {
    console.error(`verifyLibBundle: ${cssPath} not found. Run yarn build:lib:js first.`);
    process.exit(1);
}

assertBlueprintStaysExternal(bundle);
reportGzipBudgets();

console.log(
    'verifyLibBundle: OK, library bundle is self-contained, within its gzip budget, and package exports resolve to verified assets',
);
