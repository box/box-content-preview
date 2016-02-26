var path = require('path');

module.exports = {
    test: /\.js$/,
    loader: 'isparta',
    exclude: [
        /__tests__/,
        /third\-party/,
        path.resolve('node_modules')
    ]
};
