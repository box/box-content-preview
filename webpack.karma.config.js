var merge = require('deepmerge');
var path = require('path');
var commonConfig = require('./webpack.common.config');
var js = path.join(__dirname, 'src/js');

module.exports = merge(commonConfig('dev', 'en-US'), {

    isparta: {
        embedSource: true,
        noAutoWrap: true
    },

    devtool: 'inline-source-map',

    resolve: {
        alias: {
            sinon: 'sinon/pkg/sinon'
        },
    },

    module: {
        preLoaders: [
            {
                test: js,
                loader: 'isparta',
                exclude: [
                    /__tests__/
                ],
            },
            {
                test: /\-test.js$/,
                loader: 'babel',
            }
        ],
        noParse: [
            /\/sinon\.js/,
        ],
    },

    externals: {
        jsdom: 'window'
    }
});
