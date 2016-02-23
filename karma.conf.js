require('es6-promise').polyfill();

var path = require('path');
var js = path.join(__dirname, 'src/js');
var css = path.join(__dirname, 'src/css');
var img = path.join(__dirname, 'src/img');
var test = path.join(__dirname, 'test');

var webpackConfig = require('./webpack.karma.config');

module.exports = function(config) {

    config.set({

        basePath: '',

        frameworks: ['mocha', 'sinon-stub-promise', 'chai-sinon', 'chai-as-promised', 'chai', 'sinon', 'fixture'],

        files: [
            'src/**/*-test.js'
        ],

        exclude: [],

        preprocessors: {
            'src/**/*-test.js': [ 'webpack', 'sourcemap' ]
        },

        reporters: ['mocha', 'coverage', 'threshold'],

        webpack: webpackConfig,

        webpackMiddleware: {
            noInfo: true
        },

        coverageReporter: {
            type: 'html',
            dir: 'coverage/'
        },

        thresholdReporter: {
            statements: 1,
            branches: 1,
            functions: 1,
            lines: 1
        },

        port: 9876,

        colors: true,

        logLevel: config.LOG_INFO,

        autoWatch: false,

        browsers: ['Chrome'],

        browserNoActivityTimeout: 100000,

        captureConsole: true,

        singleRun: true
    });
};