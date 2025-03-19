const { NODE_ENV, BROWSER_OVERRIDE } = process.env;
const isDev = NODE_ENV === 'dev';
const isProd = NODE_ENV === 'production';
const isBrowserOverride = BROWSER_OVERRIDE === 'true';

const fs = require('fs');
const get = require('lodash/get');
const path = require('path');
const locales = require('@box/languages');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

const { execSync } = require('child_process');
const commonConfig = require('./webpack.common.config');
const RsyncPlugin = require('./RsyncPlugin');
const ApiRsyncPlugin = require('./ApiRsyncPlugin');

let version = '';
if (isBrowserOverride) {
    /* eslint-disable */
    version = process.env.BROWSER_OVERRIDE_VERSION || require('../package.json').version;
    /* eslint-disable */
} else if (isProd) {
    /* eslint-disable */
    version = require('../package.json').version;
    /* eslint-disable */
} else {
    version = 'dev';
}

console.log(version);
let rsyncLocation = '';
let rsyncApiLocation = null;
if (fs.existsSync('build/rsync.json')) {
    /* eslint-disable */
    const rsyncConf = require('./rsync.json');
    rsyncLocation = rsyncConf.location;
    rsyncApiLocation = rsyncConf.apiLocation;
    /* eslint-enable */
}

const lib = path.resolve('src/lib');
const thirdParty = path.resolve('src/third-party');
const assetsFolder = isBrowserOverride ? 'cdn01.boxcdn.net/platform/preview' : 'dist';
const staticFolder = path.resolve(assetsFolder);
const languages = isProd ? locales : ['en-US']; // Only 1 language needed for dev

/* eslint-disable key-spacing, require-jsdoc */
function updateConfig(conf, language, index) {
    const config = {
        ...conf,
        entry: {
            annotations: ['box-annotations'],
            preview: [`${lib}/Preview.js`],
            csv: [`${lib}/viewers/text/BoxCSV.js`],
            archive: [`${lib}/viewers/archive/BoxArchive.js`],
        },
        mode: isProd ? 'production' : 'development',
        optimization: {
            minimizer: [
                new UglifyJsPlugin({
                    uglifyOptions: {
                        compress: {
                            drop_console: true,
                        },
                        output: {
                            comments: /^\/*!/,
                        },
                        sourceMap: false,
                    },
                }),
            ],
        },
        output: {
            filename: '[Name].js',
            path: path.resolve(assetsFolder, version, language),
        },
        performance: {
            maxAssetSize: 500000,
            maxEntrypointSize: 750000,
        },
        devServer: {
            contentBase: './src',
            disableHostCheck: true,
            host: '0.0.0.0',
            inline: true,
            port: 8000,
        },
    };

    if (index === 0) {
        config.plugins.push(new RsyncPlugin(thirdParty, staticFolder));
    }

    if (isDev) {
        config.devtool = 'source-map';

        if (rsyncLocation && !isBrowserOverride) {
            config.plugins.push(new RsyncPlugin(`${assetsFolder}/.`, rsyncLocation));
        }

        if (rsyncApiLocation && !isBrowserOverride) {
            const serverResponse = execSync(
                `curl -sk -H "Content-Type: application/json"  --connect-timeout 1 ${rsyncApiLocation.url}`,
            )
                .toString()
                .replace('\n', '');

            const json = JSON.parse(serverResponse);

            const destination = `${rsyncApiLocation.user}@${get(json, rsyncApiLocation.ip)}:${rsyncApiLocation.path}`;

            config.plugins.push(new ApiRsyncPlugin(`${assetsFolder}/.`, destination));
        }
    }

    if (isProd) {
        // Optimize CSS - minimize, remove comments and duplicate rules
        config.plugins.push(
            new OptimizeCssAssetsPlugin({
                cssProcessorOptions: {
                    safe: true,
                },
            }),
        );
    }

    return config;
}

const localizedConfigs = languages.map((language, index) => updateConfig(commonConfig(language), language, index));
module.exports = localizedConfigs.length > 1 ? localizedConfigs : localizedConfigs[0];
