echo "-----------------------------------------------------------------------------------"
echo "Fetching latest pdf.js files from pdfjs-dist repo..."
echo "-----------------------------------------------------------------------------------"
rm -rf ./pdfjs-dist/
git clone https://github.com/mozilla/pdfjs-dist.git

echo "-----------------------------------------------------------------------------------"
echo "Copying relevant files to Preview third-party dir..."
echo "Note that we are NOT copying compatibility.js - that needs to be manually updated"
echo "-----------------------------------------------------------------------------------"
cp pdfjs-dist/build/pdf.js src/third-party/doc/
cp pdfjs-dist/build/pdf.worker.js src/third-party/doc/
cp pdfjs-dist/web/pdf_viewer.js src/third-party/doc/
cp pdfjs-dist/web/pdf_viewer.css src/third-party/doc/
cp pdfjs-dist/cmaps/* src/third-party/doc/cmaps/
rm -rf ./pdfjs-dist/

# Fix Chrome console warning issue by not testing for moz-chunked-arraybuffer support in Chrome
echo "-----------------------------------------------------------------------------------"
echo "Tweaking pdf.worker.js for Chrome..."
echo "-----------------------------------------------------------------------------------"
sed -e 's/function supportsMozChunkedClosure/!\(\/Chrome\/\.test\(navigator\.userAgent\)\) \&\& function supportsMozChunkedClosure/' -i '' src/third-party/doc/pdf.worker.js
