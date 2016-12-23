const path = require('path');
const I18nPlugin = require('i18n-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const DefinePlugin = require('webpack').DefinePlugin;

/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
module.exports = (language) => {
    const langJson = require(`${path.resolve('src/i18n/json')}/${language}.json`);
    return {
        bail: true,
        resolve: {
            modules: ['src', 'node_modules']
        },
        resolveLoader: {
            modules: [path.resolve('src'), path.resolve('node_modules')]
        },
        module: {
            rules: [
                {
                    test: /\.s?css$/,
                    loader: ExtractTextPlugin.extract({
                        fallbackLoader: 'style-loader',
                        loader: [
                            {
                                loader: 'css-loader',
                                options: { importLoaders: 1 }
                            },
                            {
                                loader: 'postcss-loader'
                            },
                            {
                                loader: 'sass-loader'
                            }
                        ]
                    }),
                    exclude: [
                        path.resolve('src/third-party'),
                        path.resolve('node_modules')
                    ]
                },
                {
                    test: /\.(svg|html)$/,
                    loader: 'raw-loader',
                    exclude: [
                        path.resolve('src/third-party'),
                        path.resolve('node_modules')
                    ]
                },
                {
                    test: /\.(jpe?g|png|gif|woff2|woff)$/,
                    loader: 'file-loader',
                    options: {
                        name: '[path][name].[ext]'
                    },
                    exclude: [
                        path.resolve('src/third-party'),
                        path.resolve('node_modules')
                    ]
                }
            ]
        },
        plugins: [
            new ExtractTextPlugin({
                filename: '[name].css',
                allChunks: true
            }),
            new I18nPlugin(langJson),
            new DefinePlugin({
                'process.env': {
                    NODE_ENV: JSON.stringify(process.env.NODE_ENV),
                    BABEL_ENV: JSON.stringify(process.env.BABEL_ENV)
                }
            })
        ],
        stats: {
            assets: true,
            colors: true,
            version: false,
            hash: false,
            timings: true,
            chunks: false,
            chunkModules: false,
            children: false
        }
    };
};
