const stylelintrc = require.resolve('@box/frontend/stylelint/stylelint.config.js');

module.exports = {
    extends: [stylelintrc],
    rules: {
        'at-rule-no-vendor-prefix': null, // fixme
        'declaration-no-important': null, // fixme
        'keyframes-name-pattern': null,
        'no-descending-specificity': null, // fixme
        'no-duplicate-selectors': null, // fixme
        'no-invalid-position-at-import-rule': null,
        'property-no-unknown': null, // fixme
        'property-no-vendor-prefix': null, // fixme
        'scss/at-extend-no-missing-placeholder': null,
        'scss/at-mixin-pattern': null,
        'scss/dollar-variable-pattern': null,
        'scss/load-no-partial-leading-underscore': null,
        'scss/no-global-function-names': null,
        'selector-class-pattern': '[A-Za-z][A-Za-z0-9]*([-_]{1,2}[A-Za-z0-9]+)*$',
        'selector-no-vendor-prefix': null, // fixme
    },
};
