require('babel-polyfill');

const { IgnorePlugin } = require('webpack');
const commonConfig = require('./webpack.common.config');

const baseConfig = commonConfig('en-US');

const config = {
    ...baseConfig,
    devtool: 'inline-source-map',
    mode: 'development',
    resolve: {
        alias: {
            sinon: 'sinon/pkg/sinon',
        },
    },
};

config.plugins.push(
    new IgnorePlugin(/react\/addons/),
    new IgnorePlugin(/react\/lib\/ReactContext/),
    new IgnorePlugin(/react\/lib\/ExecutionEnvironment/),
);

module.exports = config;
