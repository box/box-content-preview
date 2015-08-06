var path = require('path');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
    entry: {
        preview: './src/js/preview.js',
        image: './src/js/image.js',
        images: './src/js/images.js'
    },
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[Name].js'
    },
    module: {
        loaders: [
            {
                test: path.join(__dirname, 'src/js'),
                loader: 'babel-loader',
                query: {
                    stage: 1
                }
            },

            {
                test: path.join(__dirname, 'src/css'),
                loader: ExtractTextPlugin.extract('style-loader', 'css-loader')
            },
            
            {
                test: path.join(__dirname, 'src/img'),
                loader: 'url-loader?limit=1'
            }
        ]
    },
    plugins: [
        new webpack.NoErrorsPlugin(),
        new ExtractTextPlugin('[Name].css', {
            allChunks: true
        })
    ],
    stats: {
        colors: true
    },
    
    devtool: 'source-map'
};