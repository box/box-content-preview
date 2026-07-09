/**
 * Webpack 5 loader that replaces __('key') calls with translated strings.
 * Replaces the webpack 4-only i18n-webpack-plugin.
 *
 * The language JSON is passed via loader options (set in webpack.common.config.js).
 */
module.exports = function i18nLoader(source) {
    const { translations } = this.getOptions();
    return source.replace(/__\(['"]([^'"]+)['"]\)/g, (match, key) => {
        const value = translations[key];
        if (value === undefined) {
            this.emitWarning(new Error(`i18n-loader: missing translation key "${key}"`));
            return JSON.stringify(key);
        }
        return JSON.stringify(value);
    });
};
