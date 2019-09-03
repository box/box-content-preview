const stylelintrc = require.resolve('@box/frontend/stylelint/stylelint.config.js');

module.exports = {
    extends: [stylelintrc],
    rules: {
        'at-rule-no-unknown': null,
        'no-descending-specificity': null, // fixme
    },
};
