const webpackConfig = require('./webpack.karma.config');

const getTestFile = (src) => {
    if (!src) {
        return [
            'src/lib/**/*-test.js',
            'src/lib/**/*-test.html'
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
        'src/third-party/**/*.js'
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

    reporters: ['mocha', 'coverage'],

    logLevel: config.LOG_INFO,

    singleRun: true,

    webpack: webpackConfig,

    webpackMiddleware: {
        noInfo: true
    }
});
