require('babel-polyfill');

const isRelease = process.env.NODE_ENV === 'production';
const isDev = process.env.NODE_ENV === 'dev';

const path = require('path');
const commonConfig = require('./webpack.common.config');
const RsyncPlugin = require('./RsyncPlugin');
const { UglifyJsPlugin } = require('webpack').optimize;
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const { BannerPlugin } = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const version = isRelease ? require('../package.json').version : 'dev';
const fs = require('fs');
const license = require('./license');

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

const languages = isRelease
    ? [
        'en-AU',
        'en-CA',
        'en-GB',
        'en-US',
        'en-x-pseudo',
        'bn-IN',
        'da-DK',
        'de-DE',
        'es-419',
        'es-ES',
        'fi-FI',
        'fr-CA',
        'fr-FR',
        'hi-IN',
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
    ]
    : ['en-US']; // Only 1 language needed for dev

/* eslint-disable key-spacing, require-jsdoc */
function updateConfig(conf, language, index) {
    const config = Object.assign(conf, {
        entry: {
            preview: [`${lib}/Preview.js`],
            csv: [`${lib}/viewers/text/BoxCSV.js`]
        },
        output: {
            path: path.resolve('dist', version, language),
            filename: '[Name].js'
        }
    });

    // Copy over image and 3rd party
    if (index === 0) {
        config.plugins.push(new RsyncPlugin(thirdParty, staticFolder));

        if (isRelease) {
            config.plugins.push(
                new BundleAnalyzerPlugin({
                    analyzerMode: 'static',
                    openAnalyzer: false,
                    reportFilename: '../../../reports/webpack-stats.html',
                    generateStatsFile: true,
                    statsFilename: '../../../reports/webpack-stats.json'
                })
            );
        }
    }

    if (isDev) {
        // If build/rsync.json exists, rsync bundled files to specified directory
        if (rsyncLocation) {
            config.plugins.push(new RsyncPlugin('dist/.', rsyncLocation));
        }

        // Add inline source map
        config.devtool = 'inline-source-map';
    }

    if (isRelease) {
        // http://webpack.github.io/docs/list-of-plugins.html#uglifyjsplugin
        config.plugins.push(
            new UglifyJsPlugin({
                compress: {
                    warnings: false, // Don't output warnings
                    drop_console: true // Drop console statements
                },
                comments: false, // Remove comments
                sourceMap: false
            })
        );

        // Optimize CSS - minimize, remove comments and duplicate rules
        config.plugins.push(
            new OptimizeCssAssetsPlugin({
                cssProcessorOptions: {
                    safe: true
                }
            })
        );

        // Add license message to top of code
        config.plugins.push(new BannerPlugin(license));
    }

    return config;
}

const localizedConfigs = languages.map((language, index) =>
    updateConfig(commonConfig(language), language, index)
);
module.exports = localizedConfigs.length > 1
    ? localizedConfigs
    : localizedConfigs[0];
