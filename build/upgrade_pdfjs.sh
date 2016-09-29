cd ..
rm -rf pdfjs-dist
git clone https://github.com/mozilla/pdfjs-dist.git
cd pdfjs-dist
cp build/pdf.js ../Preview/src/third-party/doc/
cp build/pdf.worker.js ../Preview/src/third-party/doc/
cp build/pdf_viewer.* ../Preview/src/third-party/doc/
cd ../Preview
