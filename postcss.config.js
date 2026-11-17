// This is used to auto-prefix CSS, see: https://github.com/postcss/postcss-loader
const autoprefixer = require('autoprefixer');

const SCOPE_CLASS = '.bp-doc';
// Files whose selectors must be confined to the doc viewer DOM. Without this
// scoping, upstream selectors like `.sidebar` and `.toggleButton` collide with
// host-app selectors when the npm pdfjs path is used.
const SCOPE_FILE_RE = /pdfjs-dist[\\/](?:legacy[\\/])?web[\\/]pdf_viewer\.css$/;
// pdf.js appends its opaque text-measurement canvas to document.body and relies on
// this rule to hide it, so a scoped selector leaves a black box over the page.
const BODY_LEVEL_SELECTORS = new Set(['.hiddenCanvasElement']);

// Checking isNested to skip a second .bp-doc prefix on a rule already inside a prefixed selector.
const isNestedInRule = rule => {
    let { parent } = rule;
    while (parent) {
        if (parent.type === 'rule') {
            return true;
        }
        ({ parent } = parent);
    }
    return false;
};

const scopePdfjsViewerCss = () => ({
    postcssPlugin: 'scope-pdfjs-viewer-css',
    Once(root, { result }) {
        if (!SCOPE_FILE_RE.test(result.opts.from || '')) {
            return;
        }
        root.walkRules(rule => {
            // Skip rules nested in @keyframes — `from`/`to`/`50%` are not selectors.
            if (rule.parent && rule.parent.type === 'atrule' && rule.parent.name === 'keyframes') {
                return;
            }
            if (isNestedInRule(rule)) {
                return;
            }
            rule.selectors = rule.selectors.map(selector => {
                const trimmed = selector.trim();
                // `:root` is the document root; rewrite to our scope so custom
                // properties declared there only apply inside the viewer.
                if (trimmed === ':root') {
                    return SCOPE_CLASS;
                }
                if (BODY_LEVEL_SELECTORS.has(trimmed)) {
                    return trimmed;
                }
                return `${SCOPE_CLASS} ${trimmed}`;
            });
        });
    },
});
scopePdfjsViewerCss.postcss = true;

module.exports = {
    plugins: [scopePdfjsViewerCss(), autoprefixer()],
};
