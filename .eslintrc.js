const eslintrc = require.resolve('@box/frontend/eslint/eslintrc.js');

module.exports = {
    extends: [eslintrc],
    globals: {
        __: false,
        __I18N__: false,
        __NAME__: false,
        __VERSION__: false,
        ActiveXObject: false,
        DocumentTouch: false,
        fail: false,
        fixture: false,
        hljs: false,
        jest: false,
        Papa: false,
        pdfjsLib: false,
        pdfjsViewer: false,
        remarkable: false,
        sinon: false,
    },
    overrides: [
        {
            files: ['**/*.ts', '**/*.tsx'],
            rules: {
                'no-shadow': 'off',
                'react/prop-types': 'off',
                '@typescript-eslint/no-unused-vars': 'off',
            },
        },
    ],
    parser: '@typescript-eslint/parser',
    rules: {
        'class-methods-use-this': 0, // fixme
        'flowtype/no-types-missing-file-annotation': 0,
        'import/no-cycle': 0, // fixme
        'import/no-extraneous-dependencies': 0, // fixme
        'import/no-unresolved': 'off', // fixme, allows JS files to import TS files
        'no-underscore-dangle': 0, // fixme
        'prefer-destructuring': ['error', { object: true, array: false }], // fixme
    },
};
