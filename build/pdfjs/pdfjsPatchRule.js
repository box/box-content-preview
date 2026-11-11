const path = require('path');

module.exports = {
    test: /[\\/]build[\\/]pdf(\.min)?\.mjs$/,
    include: [path.resolve('node_modules/pdfjs-dist')],
    use: [path.resolve(__dirname, 'pdfjsPatchLoader.js')],
};
