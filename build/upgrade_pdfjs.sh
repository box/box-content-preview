#!/bin/bash
# Run with specific branch/tag (e.g. ./upgrade_pdfjs.sh tags/v2.2.228) or with no arguments to use master

DOC_STATIC_ASSETS_BRANCH=${1:-master}
DOC_STATIC_ASSETS_VERSION=$(./build/current_version.sh)
DOC_STATIC_ASSETS_PATH="src/third-party/doc/${DOC_STATIC_ASSETS_VERSION}"

echo "Upgrading pdf.js to $DOC_STATIC_ASSETS_BRANCH";

echo "-----------------------------------------------------------------------------------"
echo "Creating target directory at $DOC_STATIC_ASSETS_PATH..."
echo "-----------------------------------------------------------------------------------"

rm -rf ${DOC_STATIC_ASSETS_PATH}

DOC_LATEST_STATIC_ASSETS=`ls src/third-party/doc | sort -t "." -k1,1n -k2,2n -k3,3n | tail -1`
echo "Usig base version from $DOC_LATEST_STATIC_ASSETS"
`cp -R src/third-party/doc/${DOC_LATEST_STATIC_ASSETS} ${DOC_STATIC_ASSETS_PATH}`

echo "-----------------------------------------------------------------------------------"
echo "Cloining pdfjs-dist repo at branch: $DOC_STATIC_ASSETS_BRANCH..."
echo "-----------------------------------------------------------------------------------"
rm -rf ./pdfjs-dist/
git clone https://github.com/mozilla/pdfjs-dist.git --depth 1 --single-branch --branch ${DOC_STATIC_ASSETS_BRANCH}

echo "-----------------------------------------------------------------------------------"
echo "Copying relevant files to Preview third-party dir..."
echo "-----------------------------------------------------------------------------------"
\cp -rf pdfjs-dist/build/pdf.js src/third-party/doc/${DOC_STATIC_ASSETS_VERSION}/
\cp -rf pdfjs-dist/build/pdf.worker.js src/third-party/doc/${DOC_STATIC_ASSETS_VERSION}/
\cp -rf pdfjs-dist/web/pdf_viewer.js src/third-party/doc/${DOC_STATIC_ASSETS_VERSION}/
\cp -rf pdfjs-dist/web/pdf_viewer.css src/third-party/doc/${DOC_STATIC_ASSETS_VERSION}/
\cp -rf pdfjs-dist/cmaps/* src/third-party/doc/${DOC_STATIC_ASSETS_VERSION}/cmaps/
rm -rf ./pdfjs-dist/

# Decreased default cached pages size to 5 on mobile web to lower memory usage
echo "-----------------------------------------------------------------------------------"
echo "Decreasing # of cached pages on mobile web..."
echo "-----------------------------------------------------------------------------------"
sed -e 's@var DEFAULT_CACHE_SIZE = 10;@var DEFAULT_CACHE_SIZE = /iphone|ipad|ipod|android|blackberry|bb10|mini|windows\sce|palm/i.test(navigator.userAgent) ? 5 : 10;@' -i '' src/third-party/doc/${DOC_STATIC_ASSETS_VERSION}/pdf_viewer.js

# Render e-signatures without validation
echo "-----------------------------------------------------------------------------------"
echo "Enabling e-signature rendering without validation..."
echo "-----------------------------------------------------------------------------------"
sed -e 's@_this3.setFlags(_util.AnnotationFlag.HIDDEN);@\/\/_this3.setFlags(_util.AnnotationFlag.HIDDEN);@' -i '' src/third-party/doc/${DOC_STATIC_ASSETS_VERSION}/pdf.worker.js

# Miniy the libraries
./build/minify_pdfjs.sh
