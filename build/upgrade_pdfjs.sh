cd ..
rm -rf pdfjs-dist
git clone https://github.com/mozilla/pdfjs-dist.git
cd pdfjs-dist
cp build/pdf.js ../Preview/src/third-party/doc/
cp build/pdf.worker.js ../Preview/src/third-party/doc/
cp build/pdf_viewer.* ../Preview/src/third-party/doc/
cd ../Preview
uglifyjs src/third-party/doc/pdf.js --compress -o src/third-party/doc/pdf.js
uglifyjs src/third-party/doc/pdf.worker.js --compress sequences=false -o src/third-party/doc/pdf.worker.js
uglifyjs src/third-party/doc/pdf_viewer.js --compress -o src/third-party/doc/pdf_viewer.js
