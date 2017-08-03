/* eslint-disable */
const webpackConfig = require('./webpack.karma.config');

const DOC_STATIC_ASSETS_VERSION = '0.130.0';
const MEDIA_STATIC_ASSETS_VERSION = '0.127.0';
const MODEL3D_STATIC_ASSETS_VERSION = '1.4.1';
const SWF_STATIC_ASSETS_VERSION = '0.112.0';
const TEXT_STATIC_ASSETS_VERSION = '0.114.0';

const getTestFile = (src) => {
    if (!src) {
        return [
            'src/lib/**/*-test.js',
            'src/lib/**/*-test.html'
        ];
    }

    if (src.endsWith('/')) {
        return [
            `src/lib/${src}**/*-test.js`,
            `src/lib/${src}**/*-test.html`
        ];
    }

    const frags = src.split('/');
    const fileName = frags[frags.length - 1];
    if (!fileName) {
        throw new Error('Incorrect path to source file');
    }

    const path = src.replace(fileName, '');
    const base = path ? `src/lib/${path}` : 'src/lib';
    return [
        `${base}/__tests__/${fileName}-test.js`,
        `${base}/__tests__/${fileName}-test.html`
    ];
};

module.exports = (config) => config.set({
    autoWatch: false,

    basePath: '..',

    browserConsoleLogOptions: {
        level: 'log',
        format: '%b %T: %m',
        terminal: true
    },

    browsers: ['PhantomJS'],

    browserNoActivityTimeout: 100000,

    captureConsole: true,

    colors: true,

    coverageReporter: {
        check: config.src ? {} : {
            global: {
                statements: 80,
                branches: 80,
                functions: 80,
                lines: 80
            }
        },
        reporters: [
            {
                type: 'html',
                dir: 'reports/coverage/html'
            },
            {
                type: 'cobertura',
                dir: 'reports/coverage/cobertura'
            },
            { type: 'text' }
        ]
    },

    junitReporter: {
        outputDir: 'reports/coverage/junit',
        outputFile: 'junit.xml'
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
        `src/third-party/model3d/${MODEL3D_STATIC_ASSETS_VERSION}/three.min.js`,
        'node_modules/babel-polyfill/dist/polyfill.js',
        `src/third-party/doc/${DOC_STATIC_ASSETS_VERSION}/**/*.js`,
        `src/third-party/media/${MEDIA_STATIC_ASSETS_VERSION}/**/*.js`,
        `src/third-party/model3d/${MODEL3D_STATIC_ASSETS_VERSION}/**/*.js`,
        `src/third-party/swf/${SWF_STATIC_ASSETS_VERSION}/**/*.js`,
        `src/third-party/text/${TEXT_STATIC_ASSETS_VERSION}/**/*.js`
    ].concat(getTestFile(config.src)),

    exclude: [],

    preprocessors: {
        'src/lib/**/*-test.js': ['webpack', 'sourcemap'],
        'src/lib/**/*-test.html': ['html2js']
    },

    phantomjsLauncher: {
        exitOnResourceError: false
    },

    port: 9876,

    reporters: ['mocha', 'coverage', 'junit'],

    logLevel: config.LOG_ERROR,

    singleRun: true,

    webpack: webpackConfig,

    webpackMiddleware: {
        noInfo: true
    }
});
