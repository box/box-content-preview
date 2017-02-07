// This is used to auto-prefix CSS, see: https://github.com/postcss/postcss-loader
const autoprefixer = require('autoprefixer');

module.exports = {
    plugins: [
        autoprefixer()
    ]
};
