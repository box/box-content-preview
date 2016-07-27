require('babel-polyfill');

const commonConfig = require('./webpack.common.config');
const path = require('path');
const RsyncPlugin = require('./build/RsyncPlugin');

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
        image:          [`${lib}/image/image.js`],
        'multi-image':  [`${lib}/image/multi-image.js`],
        swf:            [`${lib}/swf/swf.js`],
        text:           [`${lib}/text/text.js`],
        csv:            [`${lib}/text/csv.js`],
        document:       [`${lib}/doc/document.js`],
        presentation:   [`${lib}/doc/presentation.js`],
        markdown:       [`${lib}/text/markdown.js`],
        mp4:            [`${lib}/media/mp4.js`],
        mp3:            [`${lib}/media/mp3.js`],
        dash:           [`${lib}/media/dash.js`],
        error:          [`${lib}/error/error.js`],
        box3d:          [`${lib}/box3d/box3d.js`],
        model3d:        [`${lib}/box3d/model3d/model3d.js`],
        image360:       [`${lib}/box3d/image360/image360.js`],
        video360:       [`${lib}/box3d/video360/video360.js`],
        iframe:         [`${lib}/iframe/iframe.js`]
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
        config.plugins.push(new RsyncPlugin('dist/.', '${USER}@${USER}.dev.box.net:/box/www/assets/content-experience'));
        config.devtool = '#inline-source-map';
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

    return config;
});
