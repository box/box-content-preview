const path = require('path');
const commonConfig = require('./webpack.common.config');

const config = commonConfig('en-US');

module.exports = {
    ...config,
    devtool: false,
    entry: { poc: path.resolve('src/lib/poc-preview.tsx') },
    mode: 'development',
    output: {
        filename: '[name].js',
        path: path.resolve('dist/poc'),
    },
};
