const crypto = require('crypto');

module.exports = {
    getCacheKey(sourceText, sourcePath, options) {
        return crypto
            .createHash('md5')
            .update(sourceText)
            .update('\0', 'utf8')
            .update(sourcePath)
            .update('\0', 'utf8')
            .update(options.configString)
            .update('\0', 'utf8')
            .update(options.instrument ? 'instrument' : '')
            .digest('hex');
    },

    process(sourceText) {
        // Escape U+2028/U+2029 so the emitted module source stays single-line safe
        const json = JSON.stringify(sourceText)
            .replace(/\u2028/g, '\\u2028')
            .replace(/\u2029/g, '\\u2029');
        return {
            code: `module.exports = ${json};`,
        };
    },
};
