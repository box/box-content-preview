/* eslint-disable global-require, import/no-dynamic-require */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { BannerPlugin, DefinePlugin, NormalModuleReplacementPlugin } = require('webpack');
const license = require('./license');
const pkg = require('../package.json');

// Like RsyncPlugin, but without --delete. Multiple instances can target the same
// destination directory without clobbering earlier copies.
class CopyAssetsPlugin {
    constructor(source, destination) {
        this.source = source;
        this.destination = destination;
    }

    apply(compiler) {
        compiler.hooks.done.tap('CopyAssetsPlugin', () => {
            fs.mkdirSync(this.destination, { recursive: true });
            execSync(`rsync -avzq --exclude=".*" "${this.source}" "${this.destination}"`, { stdio: 'inherit' });
        });
    }
}

const src = path.resolve('src');
// pdfjs comes from the npm package (pdfjs-dist) bundled by webpack — useNpmPdfjs is
// always on for the npm path (see src/index.ts). The vendored src/third-party/doc/
// directory is only used by CDN consumers and is intentionally NOT copied here.
const thirdPartyMedia = path.resolve('src/third-party/media');
const thirdPartyText = path.resolve('src/third-party/text');
const thirdPartyModel3d = path.resolve('src/third-party/model3d');
const thirdPartySwf = path.resolve('src/third-party/swf');
const exifAssets = path.resolve('src/lib/exif');
const pdfjsCmaps = path.resolve('node_modules/pdfjs-dist/cmaps');
const outDir = path.resolve('dist/lib');

const language = 'en-US';
const langJson = require(`${path.resolve('src/i18n/json')}/${language}.json`);

module.exports = {
    bail: true,
    mode: 'production',
    entry: {
        index: path.resolve('src/index.ts'),
    },
    output: {
        path: outDir,
        filename: '[name].js',
        library: { type: 'module' },
        module: true,
        // chunkLoading: false suppresses webpack's chunk-loading runtime. Without this,
        // webpack emits an `import("./" + chunkId)` line that downstream webpack builds
        // re-parse as a context module — sweeping in every file under dist/lib/, including
        // .bin/.d.ts, and failing the consumer build.
        environment: { module: true, dynamicImport: false },
        chunkLoading: false,
        clean: true,
    },
    experiments: {
        outputModule: true,
    },
    externals: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'box-annotations',
        /^box-ui-elements(\/.*)?$/,
        /^@box\/blueprint-web(\/.*)?$/,
        /^@box\/blueprint-web-assets(\/.*)?$/,
        /^@box\/react-virtualized(\/.*)?$/,
    ],
    externalsType: 'module',
    module: {
        rules: [
            {
                test: /\.(js|ts|tsx)$/,
                use: [
                    { loader: 'babel-loader' },
                    {
                        loader: path.resolve('build/i18n-loader.js'),
                        options: { translations: langJson },
                    },
                ],
                include: [path.resolve('src/lib'), path.resolve('src/index.ts')],
            },
            {
                test: /\.s?css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader', 'sass-loader'],
                include: [
                    path.resolve('src/lib'),
                    path.resolve('node_modules/box-annotations'),
                    path.resolve('node_modules/box-ui-elements'),
                    path.resolve('node_modules/pdfjs-dist'),
                ],
            },
            {
                test: /\.(svg|html)$/,
                type: 'asset/source',
                include: [path.resolve('src/lib')],
            },
            {
                test: /\.(jpe?g|png|gif|woff2|woff)$/,
                type: 'asset/resource',
                include: [path.resolve('src/lib')],
                generator: {
                    filename: 'assets/[name][ext]',
                },
            },
        ],
    },
    optimization: {
        minimize: false,
        // Inline all dynamic imports into the single lib bundle. Combined with
        // chunkLoading: false above, this guarantees no chunk-loading runtime is emitted.
        splitChunks: false,
        runtimeChunk: false,
    },
    ignoreWarnings: [
        // pdfjs-dist contains an internal dynamic require that webpack flags as a critical
        // dependency. Safe to ignore — same suppression as the CDN webpack config.
        { module: /pdfjs-dist/, message: /Critical dependency/ },
    ],
    plugins: [
        new BannerPlugin(license),
        new DefinePlugin({
            __LANGUAGE__: JSON.stringify(language),
            __NAME__: JSON.stringify(pkg.name),
            __VERSION__: JSON.stringify(pkg.version),
            'process.env.BABEL_ENV': JSON.stringify(process.env.BABEL_ENV),
        }),
        new MiniCssExtractPlugin({ filename: '[name].css' }),
        new NormalModuleReplacementPlugin(/\/iconv-loader$/),
        // Copy static assets that the legacy code resolves at runtime via createAssetUrlCreator.
        // These need to be served alongside the bundle for npm consumers. pdfjs is excluded —
        // it's bundled from the pdfjs-dist npm package (useNpmPdfjs=true on the npm path).
        new CopyAssetsPlugin(thirdPartyMedia, path.join(outDir, 'third-party')),
        new CopyAssetsPlugin(thirdPartyText, path.join(outDir, 'third-party')),
        new CopyAssetsPlugin(thirdPartyModel3d, path.join(outDir, 'third-party')),
        new CopyAssetsPlugin(thirdPartySwf, path.join(outDir, 'third-party')),
        new CopyAssetsPlugin(exifAssets, outDir),
        new CopyAssetsPlugin(pdfjsCmaps, outDir),
    ],
    resolve: {
        alias: {
            'box-annotations-messages': path.resolve(`node_modules/box-annotations/i18n/${language}`),
            'box-elements-messages': path.resolve(`node_modules/box-ui-elements/i18n/${language}`),
        },
        extensions: ['.tsx', '.ts', '.js'],
        modules: [src, 'node_modules'],
    },
    stats: {
        assets: true,
        children: false,
        chunks: false,
        colors: true,
        hash: false,
        timings: true,
        version: false,
    },
};
