// Re-export the legacy Preview class as the default export of the npm package.
// Consumers can `import Preview from 'box-content-preview'` to use the imperative API.
import LegacyPreview from './lib/Preview';

// npm consumers always use the bundled pdfjs-dist (PREVIEW-111) — there's no CDN serving
// the vendored pdf.min.mjs at runtime. Inject useNpmPdfjs=true into options.features
// before delegating to the underlying show().
class Preview extends LegacyPreview {
    show(fileIdOrFile: string | object, token: unknown, options: { features?: Record<string, unknown> } = {}): void {
        const features = { useNpmPdfjs: true, ...(options.features ?? {}) };
        // @ts-expect-error — LegacyPreview is a JS class without a typed signature.
        return super.show(fileIdOrFile, token, { ...options, features });
    }
}

export default Preview;
export { Preview };
