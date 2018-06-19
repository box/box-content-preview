# Run ./fetch_pdfjs.sh $VERSION to upgrade to that version (e.g. ./fetch_pdfjs.sh v2.0.550) or with no arguments to
# upgrade to the bleeding edge

echo "$1";

DOC_STATIC_ASSETS_VERSION=$(./build/current_version.sh)
DOC_STATIC_ASSETS_PATH="src/third-party/doc/$DOC_STATIC_ASSETS_VERSION"

if [ ! -d $DOC_STATIC_ASSETS_PATH ]; then
    DOC_LATEST_STATIC_ASSETS=`ls src/third-party/doc | sort -t "." -k1,1n -k2,2n -k3,3n | tail -1`
    echo "Latest version is $DOC_LATEST_STATIC_ASSETS"
    `cp -R src/third-party/doc/$DOC_LATEST_STATIC_ASSETS $DOC_STATIC_ASSETS_PATH`
    rm src/third-party/doc/$DOC_STATIC_ASSETS_VERSION/pdf.min.js
    rm src/third-party/doc/$DOC_STATIC_ASSETS_VERSION/pdf.worker.min.js
    rm src/third-party/doc/$DOC_STATIC_ASSETS_VERSION/pdf_viewer.min.js
    rm src/third-party/doc/$DOC_STATIC_ASSETS_VERSION/pdf_viewer.min.css
    echo "Created build directory for $DOC_STATIC_ASSETS_PATH"
fi

echo "-----------------------------------------------------------------------------------"
echo "Fetching latest pdf.js files from pdfjs-dist repo..."
echo "-----------------------------------------------------------------------------------"
rm -rf ./pdfjs-dist/
git clone https://github.com/mozilla/pdfjs-dist.git

if [ ! -z "$1" ]; then
    echo "-------------------------------------------------------------------------------"
    echo "Checking out pdf.js $1"
    echo "-------------------------------------------------------------------------------"
    cd pdfjs-dist/
    git checkout $1
    cd ..
fi

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
echo "Decreasing # of cached pages on mobile web..."
echo "-----------------------------------------------------------------------------------"
sed -e 's@var DEFAULT_CACHE_SIZE = 10;@var DEFAULT_CACHE_SIZE = /iphone|ipad|ipod|android|blackberry|bb10|mini|windows\sce|palm/i.test(navigator.userAgent) ? 5 : 10;@' -i '' src/third-party/doc/$DOC_STATIC_ASSETS_VERSION/pdf_viewer.js

# Render e-signatures without validation
echo "-----------------------------------------------------------------------------------"
echo "Enabling e-signature rendering without validation..."
echo "-----------------------------------------------------------------------------------"
sed -e 's@_this2.setFlags(_util.AnnotationFlag.HIDDEN);@\/\/_this2.setFlags(_util.AnnotationFlag.HIDDEN);@' -i '' src/third-party/doc/$DOC_STATIC_ASSETS_VERSION/pdf.worker.js

echo "-----------------------------------------------------------------------------------"
echo "Fetched latest pdf.js!"
echo "-----------------------------------------------------------------------------------"
./build/minify_pdfjs.sh
