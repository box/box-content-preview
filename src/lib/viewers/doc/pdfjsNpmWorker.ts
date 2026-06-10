export default function getPdfjsWorkerSrc(): string {
    // Resolving via import.meta.url requires the consumer's webpack to define
    // __webpack_require__.b (the runtime base URL). When that's not configured,
    // new URL() throws "Invalid URL". Returning empty string lets pdfjs use its
    // own default discovery — consumers should pass an explicit workerSrc via
    // Preview.show({ pdfjs: { workerSrc } }) to avoid this fallback path entirely.
    try {
        return new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    } catch (e) {
        return '';
    }
}
