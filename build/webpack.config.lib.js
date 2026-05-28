const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { BannerPlugin } = require('webpack');
const license = require('./license');

const src = path.resolve('src');
const outDir = path.resolve('dist/lib');

module.exports = {
    bail: true,
    mode: 'production',
    entry: {
        index: path.resolve('src/index.ts'),
    },
    output: {
        path: outDir,
        filename: '[name].js',
        library: { type: 'module' },
        module: true,
        environment: { module: true, dynamicImport: true },
        clean: true,
    },
    experiments: {
        outputModule: true,
    },
    externals: ['react', 'react-dom', 'react/jsx-runtime', /^@box\/blueprint-web(\/.*)?$/],
    externalsType: 'module',
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                use: [{ loader: 'babel-loader' }],
                include: [
                    path.resolve('src/index.ts'),
                    path.resolve('src/components'),
                    path.resolve('src/hooks'),
                    path.resolve('src/types'),
                ],
            },
            {
                test: /\.s?css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader', 'sass-loader'],
                include: [path.resolve('src/components'), path.resolve('src/hooks')],
            },
            {
                test: /\.svg$/,
                type: 'asset/source',
                include: [path.resolve('src/components'), path.resolve('src/hooks')],
            },
        ],
    },
    optimization: {
        minimize: false,
    },
    plugins: [new BannerPlugin(license), new MiniCssExtractPlugin({ filename: '[name].css' })],
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        modules: [src, 'node_modules'],
    },
    stats: {
        assets: true,
        children: false,
        chunks: false,
        colors: true,
        hash: false,
        timings: true,
        version: false,
    },
};
