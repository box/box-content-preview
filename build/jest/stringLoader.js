const crypto = require('crypto');

module.exports = {
    getCacheKey(fileData, filePath, configStr, options) {
        return crypto
            .createHash('md5')
            .update(fileData)
            .update('\0', 'utf8')
            .update(filePath)
            .update('\0', 'utf8')
            .update(configStr)
            .update('\0', 'utf8')
            .update(JSON.stringify(options))
            .digest('hex');
    },

    process: content => {
        // escape newlines
        const json = JSON.stringify(content)
            .replace(/\u2028/g, '\\u2028')
            .replace(/\u2029/g, '\\u2029');
        return `module.exports = ${json};`;
    },
};
