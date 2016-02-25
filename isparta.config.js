var path = require('path');
var js = path.join(__dirname, 'src/js');

module.exports = {
    test: js,
    loader: 'isparta',
    exclude: [
        /__tests__/,
        /third\-party/,
        path.resolve('node_modules')
    ],
};
