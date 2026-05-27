export default function getPdfjsWorkerSrc(): string {
    return new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
}
