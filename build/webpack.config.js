const { NODE_ENV } = process.env;
const isDev = NODE_ENV === 'dev';
const isProd = NODE_ENV === 'production';

const fs = require('fs');
const path = require('path');
const locales = require('@box/languages');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

const commonConfig = require('./webpack.common.config');
const RsyncPlugin = require('./RsyncPlugin');
const version = isProd ? require('../package.json').version : 'dev';

let rsyncLocation = '';
if (fs.existsSync('build/rsync.json')) {
    /* eslint-disable */
    const rsyncConf = require('./rsync.json');
    rsyncLocation = rsyncConf.location;
    /* eslint-enable */
}

const lib = path.resolve('src/lib');
const thirdParty = path.resolve('src/third-party');
const staticFolder = path.resolve('dist');
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
            path: path.resolve('dist', version, language),
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

        if (rsyncLocation) {
            config.plugins.push(new RsyncPlugin('dist/.', rsyncLocation));
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
