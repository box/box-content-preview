require('es6-promise').polyfill();

var path = require('path');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var I18nPlugin = require('i18n-webpack-plugin');
var exec = require('child_process').exec;

var js = path.join(__dirname, 'src/js');
var i18n = path.join(__dirname, 'src/i18n/json');
var css = path.join(__dirname, 'src/css');
var img = path.join(__dirname, 'src/img');
var test = path.join(__dirname, 'test');
var static = path.join(__dirname, 'src/third-party/static');

var languages = {
    'en-US': require(i18n + '/en-US.json'),
    'fr-CA': require(i18n + '/fr-CA.json'),
    'ja-JP': require(i18n + '/ja-JP.json')
};

// Check if webpack was run with a production flag that signifies a release build
var isRelease = process.env.BUILD_PROD === '1';

// If this is not a release build don't bother building for multiple locales
var languagesArray = isRelease ? Object.keys(languages) : [ 'en-US' ];

// Get the version from package.json
var version = isRelease ? require('./package.json').version : 'dev';

// Rsync plugin that copies things from the dist folder to our dev machine
function RsyncPlugin(source, destination) {
    this.source = source;
    this.destination = destination;
}
RsyncPlugin.prototype.apply = function(compiler) {
    var self = this;
    compiler.plugin('done', function() {
        console.log('--------- Rsync starting for ' + self.source + ' ---------');
        exec('rsync -avz --delete --exclude=".*" ' + self.source + ' ' + self.destination);
        console.log('--------- Rsync done ---------');
    });
};

module.exports = languagesArray.map(function(language, index) {

    // Output path
    var dist = path.join(__dirname, 'dist', version, language);

    // List of plugins used for building our bundles
    var plugins = [
        new webpack.NoErrorsPlugin(),
        new ExtractTextPlugin('[Name].css', { allChunks: true }),
        new I18nPlugin(languages[language]),
        new RsyncPlugin('src/third-party/static', dist)
    ];

    // If this is not a release build, add the Rsync plugin for local
    // development where copying to dev VM is needed.
    if (!isRelease) {
        plugins.push(new RsyncPlugin('dist/.', '${USER}@${USER}.dev.box.net:/box/www/assets/content-experience'));
    }

    return {
        entry: {
            preview: js + '/preview.js',
            image: js + '/image/image.js',
            'multi-image': js + '/image/multi-image.js',
            swf: js + '/swf/swf.js',
            text: js + '/text/text.js',
            csv: js + '/text/csv.js',
            'document': js + '/doc/document.js',
            presentation: js + '/doc/presentation.js',
            markdown: js + '/text/markdown.js',
            mp4: js + '/media/mp4.js',
            mp3: js + '/media/mp3.js',
            dash: js + '/media/dash.js',
            unsupported: js + '/unsupported/unsupported.js'
        },
        output: {
            path: dist,
            filename: '[Name].js'
        },
        module: {
            loaders: [
                {
                    test: js,
                    loader: 'babel-loader'
                },

                {
                    test: css,
                    loader: ExtractTextPlugin.extract('style-loader', 'css-loader')
                },

                {
                    test: img,
                    loader: 'url-loader?limit=1'
                }
            ]
        },
        plugins: plugins,
        stats: {
            colors: true
        },

        devtool: 'inline-source-map'
    };
});
