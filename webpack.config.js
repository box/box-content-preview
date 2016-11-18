require('babel-polyfill');

const commonConfig = require('./webpack.common.config');
const path = require('path');
const RsyncPlugin = require('./build/RsyncPlugin');
const webpack = require('webpack');

const lib = path.join(__dirname, 'src/lib');
const thirdParty = path.join(__dirname, 'src/third-party');

// Check if webpack was run with a production flag that signifies a release build
const isRelease = process.env.BUILD_PROD === '1';

// Check if webpack was run with a CI flag that signifies a CI build
const isCI = process.env.BUILD_CI === '1';

// Get the version from package.json
const version = (isRelease || isCI) ? require('./package.json').version : 'dev';

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

module.exports = languages.map((language, index) => {
    // Static output path
    const staticFolder = path.join(__dirname, 'dist', version);

    // Get the common config
    const config = commonConfig(language);

    // Add entries
    /* eslint-disable key-spacing */
    config.entry = {
        preview:        [`${lib}/preview.js`],
        image:          [`${lib}/viewers/image/image.js`],
        'multi-image':  [`${lib}/viewers/image/multi-image.js`],
        swf:            [`${lib}/viewers/swf/swf.js`],
        text:           [`${lib}/viewers/text/text.js`],
        csv:            [`${lib}/viewers/text/csv.js`],
        document:       [`${lib}/viewers/doc/document.js`],
        presentation:   [`${lib}/viewers/doc/presentation.js`],
        markdown:       [`${lib}/viewers/text/markdown.js`],
        mp4:            [`${lib}/viewers/media/mp4.js`],
        mp3:            [`${lib}/viewers/media/mp3.js`],
        dash:           [`${lib}/viewers/media/dash.js`],
        error:          [`${lib}/viewers/error/error.js`],
        box3d:          [`${lib}/viewers/box3d/box3d.js`],
        model3d:        [`${lib}/viewers/box3d/model3d/model3d.js`],
        image360:       [`${lib}/viewers/box3d/image360/image360.js`],
        video360:       [`${lib}/viewers/box3d/video360/video360.js`],
        iframe:         [`${lib}/viewers/iframe/iframe.js`],
        office:         [`${lib}/viewers/office/office.js`]
    };
    /* eslint-enable key-spacing */

    // Add output path
    config.output = {
        path: path.join(__dirname, 'dist', version, language),
        filename: '[Name].js'
    };

    // Copy over image and 3rd party
    if (index === 0) {
        config.plugins.push(new RsyncPlugin(thirdParty, staticFolder));
    }

    // If this is not a release build
    //      add the Rsync plugin for local development where copying to dev VM is needed.
    //      change source maps to be inline
    if (!isRelease && !isCI) {
        /* eslint-disable no-template-curly-in-string */
        config.plugins.push(new RsyncPlugin('dist/.', '${USER}@${USER}.dev.box.net:/box/www/assets/content-experience'));
        /* eslint-enable no-template-curly-in-string */
        config.devtool = '#inline-source-map';
    }

    if (isRelease) {
        // http://webpack.github.io/docs/list-of-plugins.html#uglifyjsplugin
        config.plugins.push(new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false, // Don't output warnings
                drop_console: true // Drop console statements
            },
            comments: false, // Remove comments
            sourceMap: false
        }));

        // http://webpack.github.io/docs/list-of-plugins.html#occurrenceorderplugin
        config.plugins.push(new webpack.optimize.OccurrenceOrderPlugin());
    }

    // Add the babel loader
    config.module.loaders.push({
        test: /\.js$/,
        loader: 'babel',
        exclude: [
            /third\-party/,
            path.resolve('node_modules')
        ]
    });

    // Add license message to top of code
    config.plugins.push(new webpack.BannerPlugin('Box Javascript Preview SDK | Copyright 2016 Box | Licenses: https://cloud.box.com/v/preview-sdk-os-licenses'));

    return config;
});
