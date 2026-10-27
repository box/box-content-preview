/**
 * Resolves sass to its Node build, which can read the SCSS files; jsdom's browser conditions pick one that cannot
 * @jest-environment-options {"customExportConditions": ["node"]}
 */
import path from 'path';
import postcss, { AtRule } from 'postcss';
import * as sass from 'sass';
import { MARKDOWN_PRINT_STYLES, PLAIN_TEXT_PRINT_STYLES } from '../printStyles';

// The print iframe holds only the text element, so rules scoped under preview's wrappers never match there
const NEEDS_PREVIEW_ANCESTOR = /^\.bp(-content)?[\s.]/;

const getRuleSignatures = (css: string): string[] => {
    const signatures: string[] = [];

    postcss.parse(css).walkRules(rule => {
        const selectors = rule.selectors.filter(selector => !NEEDS_PREVIEW_ANCESTOR.test(selector));
        if (!selectors.length) {
            return;
        }

        const { parent } = rule;
        const atRulePrefix = parent instanceof AtRule ? `@${parent.name} ${parent.params} ` : '';
        const declarations: string[] = [];
        rule.walkDecls(decl => {
            declarations.push(`${decl.prop}: ${decl.value}${decl.important ? ' !important' : ''}`);
        });
        signatures.push(`${atRulePrefix}${selectors.join(', ')} { ${declarations.join('; ')} }`);
    });

    return signatures;
};

const compileScss = (fileName: string): string => sass.compile(path.resolve(__dirname, '..', fileName)).css;

describe('lib/viewers/text/printStyles', () => {
    test.each([
        ['PlainText.scss', PLAIN_TEXT_PRINT_STYLES],
        ['Markdown.scss', MARKDOWN_PRINT_STYLES],
    ])('should match the %s rules that apply inside the print iframe', (fileName, printStyles) => {
        const compiledSignatures = getRuleSignatures(compileScss(fileName));

        expect(compiledSignatures.length).toBeGreaterThan(0);
        expect(getRuleSignatures(printStyles)).toEqual(compiledSignatures);
    });
});
