require('babel-polyfill');

var commonConfig = require('./webpack.common.config');
var path = require('path');
var RsyncPlugin = require('./build/RsyncPlugin');
var thirdParty = path.join(__dirname, 'src/third-party');
var img = path.join(__dirname, 'src/img');

// Check if webpack was run with a production flag that signifies a release build
var isRelease = process.env.BUILD_PROD === '1';

// Get the version from package.json
var version = isRelease ? require('./package.json').version : 'dev';

var languages = isRelease ? [
    "en-AU",
    "en-CA",
    "en-GB",
    "en-US",
    "da-DK",
    "de-DE",
    "es-ES",
    "fi-FI",
    "fr-CA",
    "fr-FR",
    "it-IT",
    "ja-JP",
    "ko-KR",
    "nb-NO",
    "nl-NL",
    "pl-PL",
    "pt-BR",
    "ru-RU",
    "sv-SE",
    "tr-TR",
    "zh-CN",
    "zh-TW"
] : [ 'en-US' ]; // Only 1 language needed for dev

module.exports = languages.map(function(language) {

    // Static output path
    var static = path.join(__dirname, 'dist', version);

    // Get the common config
    var config = commonConfig(language);

    // Add output path
    config.output = {
        path: path.join(__dirname, 'dist', version, language),
        filename: '[Name].js'
    };

    // Copy over image and 3rd party
    config.plugins.push(new RsyncPlugin(thirdParty, static));
    config.plugins.push(new RsyncPlugin(img, static));

    // If this is not a release build
    //      add the Rsync plugin for local development where copying to dev VM is needed.
    //      change source maps to be inline
    if (!isRelease) {
        config.plugins.push(new RsyncPlugin('dist/.', '${USER}@${USER}.dev.box.net:/box/www/assets/content-experience'));
        config.devtool = 'inline-source-map';
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
