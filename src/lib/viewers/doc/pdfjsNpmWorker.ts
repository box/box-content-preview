export default function getPdfjsWorkerSrc(): string {
    return new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
}
