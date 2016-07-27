const merge = require('deepmerge');
const path = require('path');
const commonConfig = require('./webpack.common.config');

module.exports = merge(commonConfig('en-US'), {

    isparta: {
        embedSource: true,
        noAutoWrap: true
    },

    devtool: '#inline-source-map',

    resolve: {
        alias: {
            sinon: 'sinon/pkg/sinon',
            'isomorphic-fetch': 'fetch-mock-forwarder'
        }
    },

    module: {
        preLoaders: [
            {
                test: /\.js$/,
                loader: 'babel',
                exclude: [
                    /third\-party/,
                    path.resolve('node_modules')
                ],
                query: { compact: false }
            }
        ],
        noParse: [
            /\/sinon\.js/
        ]
    },

    externals: {
        jsdom: 'window'
    }
});
