DOC_STATIC_ASSETS_VERSION=$(./build/current_version.sh)
DOC_STATIC_ASSETS_PATH="src/third-party/doc/$DOC_STATIC_ASSETS_VERSION"

if [ ! -d $DOC_STATIC_ASSETS_PATH ]; then
    DOC_LATEST_STATIC_ASSETS=`ls src/third-party/doc | sort -nr | head -1`
    echo "Latest version is $DOC_LATEST_STATIC_ASSETS"
    `cp -R src/third-party/doc/$DOC_LATEST_STATIC_ASSETS $DOC_STATIC_ASSETS_PATH`
    echo "Created build directory for $DOC_STATIC_ASSETS_PATH"
fi

echo "-----------------------------------------------------------------------------------"
echo "Fetching latest pdf.js files from pdfjs-dist repo..."
echo "-----------------------------------------------------------------------------------"
rm -rf ./pdfjs-dist/
git clone https://github.com/mozilla/pdfjs-dist.git

echo "-----------------------------------------------------------------------------------"
echo "Copying relevant files to Preview third-party dir..."
echo "-----------------------------------------------------------------------------------"
cp pdfjs-dist/build/pdf.js src/third-party/doc/$DOC_STATIC_ASSETS_VERSION/
cp pdfjs-dist/build/pdf.worker.js src/third-party/doc/$DOC_STATIC_ASSETS_VERSION/
cp pdfjs-dist/web/pdf_viewer.js src/third-party/doc/$DOC_STATIC_ASSETS_VERSION/
cp pdfjs-dist/web/pdf_viewer.css src/third-party/doc/$DOC_STATIC_ASSETS_VERSION/
cp pdfjs-dist/cmaps/* src/third-party/doc/$DOC_STATIC_ASSETS_VERSION/cmaps/
rm -rf ./pdfjs-dist/

# Fix Chrome console warning issue by not testing for moz-chunked-arraybuffer support in Chrome
echo "-----------------------------------------------------------------------------------"
echo "Tweaking pdf.js for Chrome..."
echo "-----------------------------------------------------------------------------------"
sed -e 's/function supportsMozChunkedClosure/!\(\/Chrome\/\.test\(navigator\.userAgent\)\) \&\& function supportsMozChunkedClosure/' -i '' src/third-party/doc/$DOC_STATIC_ASSETS_VERSION/pdf.js

# Decreased default cached pages size to 5 on mobile web to lower memory usage
echo "-----------------------------------------------------------------------------------"
echo "Decreasing # of cached pages on mobile web"
echo "-----------------------------------------------------------------------------------"
sed -e 's@var DEFAULT_CACHE_SIZE = 10;@var DEFAULT_CACHE_SIZE = /iphone|ipad|ipod|android|blackberry|bb10|mini|windows\sce|palm/i.test(navigator.userAgent) ? 5 : 10;@' -i '' src/third-party/doc/$DOC_STATIC_ASSETS_VERSION/pdf_viewer.js
