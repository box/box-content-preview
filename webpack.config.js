var path = require('path');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var I18nPlugin = require('i18n-webpack-plugin');

var js = path.join(__dirname, 'src/js');
var i18n = path.join(__dirname, 'src/i18n/json');
var css = path.join(__dirname, 'src/css');
var img = path.join(__dirname, 'src/img');
var test = path.join(__dirname, 'test');

var languages = {
    'en-US': require(i18n + '/en-US.json'),
    'fr-CA': require(i18n + '/fr-CA.json'),
    'ja-JP': require(i18n + '/ja-JP.json')
};

module.exports = Object.keys(languages).map(function(language) {
    return {
        entry: {
            preview: js + '/preview.js',
            image: js + '/image/image.js',
            images: js + '/image/images.js',
            swf: js + '/swf/swf.js',
            text: js + '/text/text.js',
            markdown: js + '/text/markdown.js',
            mp4: js + '/media/mp4.js',
            mp3: js + '/media/mp3.js'
        },
        output: {
            path: path.join(__dirname, 'dist/' + language),
            filename: '[Name].js'
        },
        module: {
            loaders: [
                {
                    test: js,
                    loader: 'babel-loader',
                    query: {
                        stage: 1
                    }
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
        plugins: [
            new webpack.NoErrorsPlugin(),
            new ExtractTextPlugin('[Name].css', {
                allChunks: true
            }),
            new I18nPlugin(languages[language])
            // new webpack.optimize.UglifyJsPlugin({
            //     minimize: true
            // })
        ],
        stats: {
            colors: true
        },
        
        devtool: 'source-map'
    };
});