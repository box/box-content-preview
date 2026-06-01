const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { BannerPlugin, DefinePlugin, NormalModuleReplacementPlugin } = require('webpack');
const license = require('./license');
const pkg = require('../package.json');

const isLinked = process.env.IS_LINKED === '1';

/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
module.exports = language => {
    const langJson = require(`${path.resolve('src/i18n/json')}/${language}.json`);

    return {
        bail: true,
        module: {
            rules: [
                {
                    test: /\.(js|ts|tsx)$/,
                    use: [
                        { loader: 'babel-loader' },
                        {
                            loader: path.resolve('build/i18n-loader.js'),
                            options: { translations: langJson },
                        },
                    ],
                    include: [path.resolve('src/lib')],
                },
                {
                    test: /\.s?css$/,
                    use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader', 'sass-loader'],
                    include: [
                        path.resolve('src/lib'),
                        path.resolve('node_modules/box-annotations'),
                        path.resolve('node_modules/box-ui-elements'),
                        path.resolve('node_modules/pdfjs-dist'),
                    ],
                },
                {
                    test: /\.(svg|html)$/,
                    type: 'asset/source',
                    include: [path.resolve('src/lib')],
                },
                {
                    test: /\.(jpe?g|png|gif|woff2|woff)$/,
                    type: 'asset/resource',
                    include: [path.resolve('src/lib')],
                    generator: {
                        filename: '[name][ext]',
                    },
                },
                {
                    // @box/blueprint-web's ESM build uses extensionless imports (e.g., 'lodash/noop')
                    // which webpack 5 rejects under strict ESM resolution. Relax the requirement
                    // for paths inside Blueprint so its imports resolve correctly.
                    test: /\.m?js$/,
                    include: [path.resolve('node_modules/@box/blueprint-web')],
                    resolve: {
                        fullySpecified: false,
                    },
                },
            ],
        },
        plugins: [
            new BannerPlugin(license),
            new DefinePlugin({
                __LANGUAGE__: JSON.stringify(language),
                __NAME__: JSON.stringify(pkg.name),
                __VERSION__: JSON.stringify(pkg.version),
                'process.env.BABEL_ENV': JSON.stringify(process.env.BABEL_ENV),
            }),
            new MiniCssExtractPlugin({
                filename: '[name].css',
            }),
            new NormalModuleReplacementPlugin(/\/iconv-loader$/),
        ],
        resolve: {
            alias: {
                'box-annotations-messages': path.resolve(`node_modules/box-annotations/i18n/${language}`),
                'box-elements-messages': path.resolve(`node_modules/box-ui-elements/i18n/${language}`),
            },
            extensions: ['.tsx', '.ts', '.js'],
            symlinks: !isLinked,
        },
        stats: {
            assets: true,
            children: false,
            chunkModules: false,
            chunks: false,
            colors: true,
            hash: false,
            timings: true,
            version: false,
        },
    };
};
