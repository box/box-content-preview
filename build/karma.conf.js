const webpackConfig = require('./webpack.karma.config');

module.exports = (config) => config.set({
    autoWatch: false,

    basePath: '..',

    browsers: ['PhantomJS'],

    browserNoActivityTimeout: 100000,

    captureConsole: true,

    colors: true,

    coverageReporter: {
        check: {
            global: {
                statements: 10, // 95
                branches: 10, // 95
                functions: 10, // 93
                lines: 10 // 90
            }
        },
        reporters: [
            {
                type: 'html',
                dir: 'reports/coverage'
            },
            { type: 'text' }
        ]
    },

    frameworks: [
        'mocha',
        'sinon-stub-promise',
        'chai-sinon',
        'chai-as-promised',
        'chai-dom',
        'chai',
        'sinon',
        'fixture'
    ],

    files: [
        'node_modules/babel-polyfill/dist/polyfill.js',
        'src/lib/**/*-test.js',
        'src/lib/**/*-test.html',
        'src/third-party/**/*.js'
    ],

    exclude: [],

    preprocessors: {
        'src/lib/**/*-test.js': ['webpack', 'sourcemap'],
        'src/lib/**/*-test.html': ['html2js']
    },

    phantomjsLauncher: {
        exitOnResourceError: false
    },

    port: 9876,

    reporters: ['mocha', 'coverage'],

    logLevel: config.LOG_INFO,

    singleRun: true,

    webpack: webpackConfig,

    webpackMiddleware: {
        noInfo: true
    }
});
