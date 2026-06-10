// Re-export the legacy Preview class as the default export of the npm package.
// Consumers can `import Preview from 'box-content-preview'` to use the imperative API.
//
// We monkey-patch show() to inject useNpmPdfjs=true so DocBaseViewer.setupPdfjs uses
// the statically-bundled pdfjs (see DocBaseViewer.js top-level imports). Doing this
// via prototype patch instead of a subclass avoids a webpack TDZ trap where named
// exports referenced classes declared later in the module body.
import LegacyPreview from './lib/Preview';

const originalShow = LegacyPreview.prototype.show;
// @ts-expect-error — LegacyPreview is a JS class without a typed signature.
LegacyPreview.prototype.show = function patchedShow(fileIdOrFile, token, options = {}) {
    const features = { useNpmPdfjs: true, ...(options.features ?? {}) };
    return originalShow.call(this, fileIdOrFile, token, { ...options, features });
};

export default LegacyPreview;
export { LegacyPreview as Preview };
