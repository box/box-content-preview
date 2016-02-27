var path = require('path');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var I18nPlugin = require('i18n-webpack-plugin');
var RsyncPlugin = require('./build/RsyncPlugin');

var js = path.join(__dirname, 'src/js');
var i18n = path.join(__dirname, 'src/i18n/json');
var css = path.join(__dirname, 'src/css');
var img = path.join(__dirname, 'src/img');

module.exports = function(language) {

    // Language json
    var langJson = require(i18n + '/' + language + '.json');

    return {

        entry: {
            preview:        [ js + '/preview.js' ],
            image:          [ js + '/image/image.js' ],
            'multi-image':  [ js + '/image/multi-image.js' ],
            swf:            [ js + '/swf/swf.js' ],
            text:           [ js + '/text/text.js' ],
            csv:            [ js + '/text/csv.js' ],
            'document':     [ js + '/doc/document.js' ],
            presentation:   [ js + '/doc/presentation.js' ],
            markdown:       [ js + '/text/markdown.js' ],
            mp4:            [ js + '/media/mp4.js' ],
            mp3:            [ js + '/media/mp3.js' ],
            dash:           [ js + '/media/dash.js' ],
            error:          [ js + '/error/error.js' ],
            box3d:          [ js + '/box3d/box3d.js' ],
            model3d:        [ js + '/box3d/model3d/model3d.js' ],
            image360:       [ js + '/box3d/image360/image360.js' ],
            video360:       [ js + '/box3d/video360/video360.js' ]
        },

        module: {
            loaders: [
                {
                    test: /\.s?css$/,
                    loader: ExtractTextPlugin.extract('style', 'css!sass'),
                    exclude: [
                        /third\-party/,
                        path.resolve('node_modules')
                    ]
                },

                {
                    test: /\.(jpe?g|png|gif|svg|woff2|woff)$/,
                    loader: 'url-loader?limit=10000',
                    exclude: [
                        /third\-party/,
                        path.resolve('node_modules')
                    ]
                }
            ]
        },

        plugins: [
            new ExtractTextPlugin('[Name].css', { allChunks: true }),
            new I18nPlugin(langJson)
        ],

        stats: {
            colors: true
        },

        devtool: 'source-map'
    };
};
