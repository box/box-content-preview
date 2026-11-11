const fs = require('fs');
const path = require('path');
const { patchPdfjs } = require('../patchPdfjs');

const readPdfjs = filename =>
    fs.readFileSync(path.resolve(__dirname, '../../../node_modules/pdfjs-dist/legacy/build', filename), 'utf8');

describe('patchPdfjs', () => {
    describe.each(['pdf.mjs', 'pdf.min.mjs'])('on the installed pdfjs-dist %s', filename => {
        const source = readPdfjs(filename);
        const patchedSource = patchPdfjs(source);

        test('should route both consumePath clip calls through bcpSnapRectClip', () => {
            expect(patchedSource.match(/\.clip\(bcpSnapRectClip\(/g)).toHaveLength(2);
            expect(patchedSource).toMatch(/\.clip\(bcpSnapRectClip\([\w$]+, [\w$]+\), ?"evenodd"\)/);
        });

        test('should record rectangle bounds with the opcodes pdf.js itself uses', () => {
            expect(patchedSource).toMatch(/bcpGetRectBounds\(drawOps, [\w$.]+, [\w$.]+, [\w$.]+\)/);
            expect(patchedSource).toContain('function bcpPdfjsMakePathFromDrawOPS(');
            expect(patchedSource.match(/function makePathFromDrawOPS\(/g)).toHaveLength(1);
        });

        test('should leave an already patched file unchanged', () => {
            expect(patchPdfjs(patchedSource)).toBe(patchedSource);
        });
    });

    test('should pass the full receiver chain when the context is reached through a property', () => {
        const pristineSource = readPdfjs('pdf.mjs');
        const source = pristineSource.replace(
            /(\{\s*if \(this\.pendingClip === EO_CLIP\) \{\s*)ctx\.clip\(path, "evenodd"\);(\s*\} else \{\s*)ctx\.clip\(path\);/,
            '$1this.ctx.clip(path, "evenodd");$2this.ctx.clip(path);',
        );

        expect(source).not.toBe(pristineSource);
        expect(patchPdfjs(source).match(/this\.ctx\.clip\(bcpSnapRectClip\(path, this\.ctx\)/g)).toHaveLength(2);
    });

    test('should throw when makePathFromDrawOPS is missing', () => {
        expect(() => patchPdfjs('consumePath(a, b, c) { ctx.clip(b); }')).toThrow(/makePathFromDrawOPS function/);
    });

    test('should throw when consumePath no longer has both clip calls', () => {
        const evenOddClipPattern = /(pendingClip === EO_CLIP\) \{\s*)ctx\.clip\(path, "evenodd"\)/;
        const pristineSource = readPdfjs('pdf.mjs');
        const source = pristineSource.replace(evenOddClipPattern, '$1ctx.clip("evenodd")');

        expect(source).not.toBe(pristineSource);
        expect(() => patchPdfjs(source)).toThrow(/even-odd and nonzero ctx.clip calls/);
    });
});
