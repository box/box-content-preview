var merge = require('deepmerge');
var path = require('path');
var commonConfig = require('./webpack.common.config');
var js = path.join(__dirname, 'src/js');

module.exports = merge(commonConfig('en-US'), {

    isparta: {
        embedSource: true,
        noAutoWrap: true
    },

    devtool: 'inline-source-map',

    resolve: {
        alias: {
            sinon: 'sinon/pkg/sinon',
            'isomorphic-fetch': 'fetch-mock-forwarder'
        }
    },

    module: {
        preLoaders: [
            {
                test: js,
                loader: 'babel',
                query: { compact: false }
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
