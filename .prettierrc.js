module.exports = {
    arrowParens: 'avoid',
    bracketSameLine: false,
    bracketSpacing: true,
    endOfLine: 'lf',
    insertPragma: false,
    jsxSingleQuote: false,
    printWidth: 120,
    quoteProps: 'as-needed',
    requirePragma: false,
    semi: true,
    singleQuote: true,
    tabWidth: 4,
    trailingComma: 'all',
    useTabs: false,
    overrides: [
        {
            files: '*.md',
            options: {
                parser: 'markdown',
                tabWidth: 2,
                printWidth: 80,
            },
        },
        {
            files: '*.scss',
            options: {
                parser: 'scss',
                printWidth: 512,
            },
        },
    ],
};
