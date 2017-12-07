require('babel-polyfill');

const { argv } = process;
const isDebug = argv.find((arg) => {
    return arg === '--auto-watch' || arg === '--no-single-run';
});

const { IgnorePlugin } = require('webpack');
const commonConfig = require('./webpack.common.config');

const baseConfig = commonConfig('en-US');

const config = Object.assign(baseConfig, {
    resolve: {
        alias: {
            sinon: 'sinon/pkg/sinon'
        }
    }
});

if (isDebug) {
    config.devtool = 'inline-source-map';
}


config.plugins.push(
    new IgnorePlugin(/react\/addons/),
    new IgnorePlugin(/react\/lib\/ReactContext/),
    new IgnorePlugin(/react\/lib\/ExecutionEnvironment/)
);

module.exports = config;
