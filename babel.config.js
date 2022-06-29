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
            '@babel/plugin-proposal-private-methods',
            '@babel/plugin-transform-object-assign',
        ],
        overrides: [
            {
                test: ['./src/**/*.ts', './src/**/*.tsx'],
                presets: [
                    [
                        '@babel/preset-typescript',
                        {
                            isTSX: true,
                            allExtensions: true,
                        },
                    ],
                ],
            },
            {
                test: ['./src/third-party/doc/**'],
                presets: [
                    [
                        '@babel/preset-env',
                        {
                            exclude: ['@babel/plugin-transform-unicode-regex'],
                            include: ['@babel/plugin-proposal-unicode-property-regex'],
                        },
                    ],
                ],
            },
        ],
        env: {
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
