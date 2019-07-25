module.exports = api => {
    api.cache(() => process.env.NODE_ENV);

    return {
        presets: [
            [
                '@babel/preset-env',
                {
                    modules: false,
                },
            ],
            '@babel/preset-react',
        ],
        plugins: [
            '@babel/plugin-proposal-class-properties',
            '@babel/plugin-proposal-object-rest-spread',
            '@babel/plugin-transform-object-assign',
        ],
        env: {
            production: {
                plugins: [['react-remove-properties', { properties: ['data-testid'] }]],
            },
            test: {
                plugins: [
                    [
                        'istanbul',
                        {
                            exclude: [
                                '**/*-test.js',
                                'build/**',
                                'src/lib/polyfill.js',
                                'src/lib/browser.js',
                                'src/lib/viewers/box3d/model3d/Model3DAnimationClipsPullup.js',
                                'src/lib/viewers/box3d/model3d/model3DSettingsPullup.js',
                                'src/lib/viewers/box3d/model3d/Model3DVrControls.js',
                                'src/lib/viewers/box3d/**/SceneEntities.js',
                                'src/lib/viewers/box3d/**Constants.js',
                            ],
                        },
                    ],
                    [
                        'babel-plugin-transform-require-ignore',
                        {
                            extensions: ['.scss'],
                        },
                    ],
                    '@babel/plugin-transform-modules-commonjs',
                ],
            },
        },
    };
};
