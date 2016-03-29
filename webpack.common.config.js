var path = require('path');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var I18nPlugin = require('i18n-webpack-plugin');
var RsyncPlugin = require('./build/RsyncPlugin');

var lib = path.join(__dirname, 'src/lib');
var i18n = path.join(__dirname, 'src/i18n/json');

module.exports = function(language) {

    // Language json
    var langJson = require(i18n + '/' + language + '.json');

    return {

        entry: {
            preview:        [ lib + '/preview.js' ],
            image:          [ lib + '/image/image.js' ],
            'multi-image':  [ lib + '/image/multi-image.js' ],
            swf:            [ lib + '/swf/swf.js' ],
            text:           [ lib + '/text/text.js' ],
            csv:            [ lib + '/text/csv.js' ],
            'document':     [ lib + '/doc/document.js' ],
            presentation:   [ lib + '/doc/presentation.js' ],
            markdown:       [ lib + '/text/markdown.js' ],
            mp4:            [ lib + '/media/mp4.js' ],
            mp3:            [ lib + '/media/mp3.js' ],
            dash:           [ lib + '/media/dash.js' ],
            error:          [ lib + '/error/error.js' ],
            box3d:          [ lib + '/box3d/box3d.js' ],
            model3d:        [ lib + '/box3d/model3d/model3d.js' ],
            image360:       [ lib + '/box3d/image360/image360.js' ],
            video360:       [ lib + '/box3d/video360/video360.js' ],
            iframe:         [ lib + '/iframe/iframe.js' ]
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
                    test: /\.(jpe?g|png|gif|woff2|woff)$/,
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
