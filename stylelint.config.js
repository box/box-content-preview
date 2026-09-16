module.exports = {
    extends: ['stylelint-config-standard-scss'],
    plugins: ['stylelint-order'],
    rules: {
        'at-rule-no-unknown': null,
        'media-feature-name-no-vendor-prefix': true,
        'value-no-vendor-prefix': true,
        'font-weight-notation': 'named-where-possible',
        'order/order': [
            'dollar-variables',
            'custom-properties',
            'declarations',
            'rules',
            // ignore at-rules (@supports, @include, @media)
            // so that devs can decide where to put them
        ],
        'order/properties-order': [],
        'no-descending-specificity': null, // fixme
        'declaration-no-important': null, // fixme
        'property-no-vendor-prefix': null, // fixme
        'no-duplicate-selectors': null, // fixme
        'selector-no-vendor-prefix': null, // fixme
        'property-no-unknown': null, // fixme
        'at-rule-no-vendor-prefix': null, // fixme
        // Allow digits (mp3, 360, v2) used by existing Preview class names
        'selector-class-pattern': '[A-Za-z][A-Za-z0-9]*([-_]{1,2}[A-Za-z0-9]+)*$',
        'scss/dollar-variable-pattern': null,
        'scss/at-mixin-pattern': null,
        'scss/no-global-function-names': null,
        'keyframes-name-pattern': null,
        'scss/at-extend-no-missing-placeholder': null,
        'no-invalid-position-at-import-rule': null,
        'scss/load-no-partial-leading-underscore': null,
    },
};
