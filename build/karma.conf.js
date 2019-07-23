/* eslint-disable */
const webpackConfig = require('./webpack.karma.config');

// These should be updated to match the Preview version in package.json whenever a file in that third party directory
// is updated. Also, update the matching configuration in constants.js, which is needed for main preview functionality
const DOC_STATIC_ASSETS_VERSION = '1.60.0';
const MEDIA_STATIC_ASSETS_VERSION = '2.14.0';
const MODEL3D_STATIC_ASSETS_VERSION = '1.12.0';
const SWF_STATIC_ASSETS_VERSION = '0.112.0';
const TEXT_STATIC_ASSETS_VERSION = '0.114.0';

module.exports = config =>
    config.set({
        autoWatch: false,

        basePath: '..',

        browserConsoleLogOptions: {
            level: 'log',
            format: '%b %T: %m',
            terminal: true,
        },

        browsers: ['PhantomJS'],

        browserNoActivityTimeout: 100000,

        captureConsole: true,

        colors: true,

        coverageReporter: {
            check: config.src
                ? {}
                : {
                      global: {
                          statements: 80,
                          branches: 80,
                          functions: 80,
                          lines: 80,
                      },
                  },
            reporters: [
                {
                    type: 'html',
                    dir: 'reports/coverage/html',
                },
                {
                    type: 'cobertura',
                    dir: 'reports/coverage/cobertura',
                },
                { type: 'text' },
            ],
        },

        junitReporter: {
            outputDir: 'reports/coverage/junit',
            outputFile: 'junit.xml',
        },

        frameworks: ['mocha', 'chai-dom', 'chai', 'sinon', 'sinon-chai', 'fixture'],

        files: [
            'https://cdn01.boxcdn.net/polyfills/core-js/2.5.3/core.min.js',
            `src/third-party/model3d/${MODEL3D_STATIC_ASSETS_VERSION}/three.min.js`,
            `src/third-party/doc/${DOC_STATIC_ASSETS_VERSION}/**/*.js`,
            `src/third-party/media/${MEDIA_STATIC_ASSETS_VERSION}/**/*.js`,
            `src/third-party/model3d/${MODEL3D_STATIC_ASSETS_VERSION}/**/*.js`,
            `src/third-party/swf/${SWF_STATIC_ASSETS_VERSION}/**/*.js`,
            `src/third-party/text/${TEXT_STATIC_ASSETS_VERSION}/**/*.js`,
            'src/**/__tests__/**/*-test.js',
            'src/**/__tests__/**/*-test.html',
        ],

        preprocessors: {
            'src/**/__tests__/**/*-test.js': ['webpack', 'sourcemap'],
            'src/**/__tests__/**/*-test.html': ['html2js'],
        },

        phantomjsLauncher: {
            exitOnResourceError: false,
        },

        port: 9876,

        reporters: ['mocha', 'coverage', 'junit'],

        logLevel: config.LOG_ERROR,

        singleRun: true,

        webpack: webpackConfig,

        webpackMiddleware: {
            noInfo: true,
        },
    });
