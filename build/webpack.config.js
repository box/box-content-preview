require('babel-polyfill');

const isRelease = process.env.NODE_ENV === 'production';
const isDev = process.env.NODE_ENV === 'dev';

const path = require('path');
const commonConfig = require('./webpack.common.config');
const RsyncPlugin = require('./RsyncPlugin');
const UglifyJsPlugin = require('webpack').optimize.UglifyJsPlugin;
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const BannerPlugin = require('webpack').BannerPlugin;
const version = isRelease ? require('../package.json').version : 'dev';

const lib = path.resolve('src/lib');
const thirdParty = path.resolve('src/third-party');
const staticFolder = path.resolve('dist', version);

const languages = isRelease ? [
    'en-AU',
    'en-CA',
    'en-GB',
    'en-US',
    'da-DK',
    'de-DE',
    'es-ES',
    'fi-FI',
    'fr-CA',
    'fr-FR',
    'it-IT',
    'ja-JP',
    'ko-KR',
    'nb-NO',
    'nl-NL',
    'pl-PL',
    'pt-BR',
    'ru-RU',
    'sv-SE',
    'tr-TR',
    'zh-CN',
    'zh-TW'
] : ['en-US']; // Only 1 language needed for dev

/* eslint-disable key-spacing */
function updateConfig(conf, language, index) {
    const config = Object.assign(conf, {
        entry: {
            preview:        [`${lib}/Preview.js`],
            csv:            [`${lib}/viewers/text/BoxCSV.js`]
        },
        output: {
            path: path.resolve('dist', version, language),
            filename: '[Name].js'
        }
    });

    // Copy over image and 3rd party
    if (index === 0) {
        config.plugins.push(new RsyncPlugin(thirdParty, staticFolder));
    }

    // If this is not a release and not CI build
    //      add the Rsync plugin for local development where copying to dev VM is needed.
    //      change source maps to be inline
    if (isDev) {
        /* eslint-disable no-template-curly-in-string */
        config.plugins.push(new RsyncPlugin('dist/.', '${USER}@${USER}.dev.box.net:/box/www/assets/content-experience'));
        /* eslint-enable no-template-curly-in-string */
        config.devtool = 'inline-source-map';
    }

    if (isRelease) {
        // http://webpack.github.io/docs/list-of-plugins.html#uglifyjsplugin
        config.plugins.push(new UglifyJsPlugin({
            compress: {
                warnings: false, // Don't output warnings
                drop_console: true // Drop console statements
            },
            comments: false, // Remove comments
            sourceMap: false
        }));

        // Optimize CSS - minimize, remove comments and duplicate rules
        config.plugins.push(new OptimizeCssAssetsPlugin({
            cssProcessorOptions: {
                safe: true
            }
        }));

        // Add license message to top of code
        config.plugins.push(new BannerPlugin('Box Content Preview UI Kit | Copyright 2016-2017 Box | Licenses: https://cloud.box.com/v/preview-licenses-v1'));
    }

    return config;
}

const localizedConfigs = languages.map((language, index) => updateConfig(commonConfig(language), language, index));
module.exports = localizedConfigs.length > 1 ? localizedConfigs : localizedConfigs[0];
