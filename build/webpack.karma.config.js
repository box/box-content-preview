const merge = require('deepmerge');
const path = require('path');
const IgnorePlugin = require('webpack').IgnorePlugin;
const commonConfig = require('./webpack.common.config');

const baseConfig = commonConfig('en-US');

const config = merge(baseConfig, {
    devtool: 'inline-source-map',
    resolve: {
        alias: {
            sinon: 'sinon/pkg/sinon',
            'isomorphic-fetch': 'fetch-mock-forwarder'
        }
    },
    module: {
        noParse: [
            /\/sinon\.js/
        ]
    },
    externals: {
        jsdom: 'window'
    }
});

config.module.rules.push({
    test: /\.js$/,
    loader: 'babel-loader',
    exclude: [
        path.resolve('src/third-party'),
        path.resolve('node_modules')
    ]
});

config.plugins.push(
    new IgnorePlugin(/react\/addons/),
    new IgnorePlugin(/react\/lib\/ReactContext/),
    new IgnorePlugin(/react\/lib\/ExecutionEnvironment/)
);

module.exports = config;
