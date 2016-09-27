const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const I18nPlugin = require('i18n-webpack-plugin');

const i18n = path.join(__dirname, 'src/i18n/json');

module.exports = function commonConfig(language) {
    // Language json
    /* eslint-disable global-require, import/no-dynamic-require */
    const langJson = require(`${i18n}/${language}.json`);
    /* eslint-enable global-require, import/no-dynamic-require */

    return {
        module: {
            loaders: [
                {
                    test: /\.s?css$/,
                    loader: ExtractTextPlugin.extract('style', 'css!sass'),
                    exclude: [
                        /third\-party/,
                        path.resolve('node_modules')
                    ]
                },

                {
                    test: /\.(jpe?g|cur|png|gif|woff2|woff)$/,
                    loader: 'file?name=[name].[ext]',
                    exclude: [
                        /third\-party/,
                        path.resolve('node_modules')
                    ]
                }
            ]
        },

        plugins: [
            new ExtractTextPlugin('[Name].css', { allChunks: true }),
            new I18nPlugin(langJson)
        ],

        stats: {
            colors: true
        }
    };
};
