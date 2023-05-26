#!/bin/bash
# Run with specific branch/tag (e.g. ./upgrade_pdfjs.sh tags/v2.2.228) or with no arguments to use master

#IMPORTANT!!!! See https://github.com/box/box-content-preview/pull/1466 and make sure any updated version of pdf.js includes
#this fix or fixes it on it's own


DOC_COMPILER_BINARY="build/closure-compiler-v20200719.jar"
DOC_STATIC_ASSETS_BRANCH=${1:-master}
DOC_STATIC_ASSETS_VERSION=$(./build/current_version.sh)
DOC_STATIC_ASSETS_PATH="src/third-party/doc/${DOC_STATIC_ASSETS_VERSION}"

echo "Upgrading pdf.js to $DOC_STATIC_ASSETS_BRANCH";

echo "-----------------------------------------------------------------------------------"
echo "Creating target directory at $DOC_STATIC_ASSETS_PATH..."
echo "-----------------------------------------------------------------------------------"

rm -rf ${DOC_STATIC_ASSETS_PATH}
DOC_CURRENT_ASSETS_VERSIONS=`ls src/third-party/doc | sort -t "." -k1,1n -k2,2n -k3,3n | tail -1`

echo "Using base version from $DOC_CURRENT_ASSETS_VERSIONS"
mkdir ${DOC_STATIC_ASSETS_PATH}
\cp -R src/third-party/doc/${DOC_CURRENT_ASSETS_VERSIONS}/exif.js ${DOC_STATIC_ASSETS_PATH}/
\cp -R src/third-party/doc/${DOC_CURRENT_ASSETS_VERSIONS}/exif.min.js ${DOC_STATIC_ASSETS_PATH}/
\cp -R src/third-party/doc/${DOC_CURRENT_ASSETS_VERSIONS}/images ${DOC_STATIC_ASSETS_PATH}/images

echo "-----------------------------------------------------------------------------------"
echo "Cloning pdfjs-dist repo at branch: $DOC_STATIC_ASSETS_BRANCH..."
echo "-----------------------------------------------------------------------------------"
rm -rf ./pdfjs-dist/
git clone https://github.com/mozilla/pdfjs-dist.git --depth 1 --single-branch --branch ${DOC_STATIC_ASSETS_BRANCH}

echo "-----------------------------------------------------------------------------------"
echo "Copying relevant files to third-party directory..."
echo "-----------------------------------------------------------------------------------"
\cp -rf pdfjs-dist/legacy/build/pdf.js ${DOC_STATIC_ASSETS_PATH}
\cp -rf pdfjs-dist/legacy/build/pdf.min.js ${DOC_STATIC_ASSETS_PATH}
\cp -rf pdfjs-dist/legacy/build/pdf.worker.js ${DOC_STATIC_ASSETS_PATH}
\cp -rf pdfjs-dist/legacy/build/pdf.worker.min.js ${DOC_STATIC_ASSETS_PATH}
\cp -rf pdfjs-dist/legacy/web/pdf_viewer.css ${DOC_STATIC_ASSETS_PATH}
\cp -rf pdfjs-dist/legacy/web/pdf_viewer.js ${DOC_STATIC_ASSETS_PATH}
\cp -rf pdfjs-dist/cmaps ${DOC_STATIC_ASSETS_PATH}/cmaps
rm -rf ./pdfjs-dist/

# Decreased default cached pages size to 5 on mobile web to lower memory usage
echo "-----------------------------------------------------------------------------------"
echo "Decreasing # of cached pages on mobile web..."
echo "-----------------------------------------------------------------------------------"
sed -e 's@var DEFAULT_CACHE_SIZE = 10;@var DEFAULT_CACHE_SIZE = /iphone|ipad|ipod|android|blackberry|bb10|mini|windows\sce|palm/i.test(navigator.userAgent) ? 5 : 10;@' -i '' ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.js

# Render e-signatures without validation
echo "-----------------------------------------------------------------------------------"
echo "Enabling e-signature rendering without validation..."
echo "-----------------------------------------------------------------------------------"
sed -e 's@;r.setFlags(o.AnnotationFlag.HIDDEN)@@' -i '' ${DOC_STATIC_ASSETS_PATH}/pdf.worker.min.js

# Minify using Google Closure Compiler, options:
# Output to ES5 (Box supports Chrome, Edge, IE11, Firefox, Safari, and newer versions of iOS, Android)
# Do not minify pdf.js or pdf.worker.js, as the closure compiler will mangle function names and cause bugs
echo "-----------------------------------------------------------------------------------"
echo "Minifying pdf.js files with Google Closure... Warnings are okay!"
echo "-----------------------------------------------------------------------------------"
java -jar ${DOC_COMPILER_BINARY} --rewrite_polyfills false --language_in ECMASCRIPT_2020 --language_out ECMASCRIPT_2018 --js ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.js --js_output_file ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.min.js

echo "-----------------------------------------------------------------------------------"
echo "Minifying pdf.js CSS with cssnano"
echo "-----------------------------------------------------------------------------------"
./node_modules/.bin/cssnano ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.css ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.min.css

echo "-----------------------------------------------------------------------------------"
echo "Successfully updated and minified pdf.js files!"
echo "-----------------------------------------------------------------------------------"

echo "------------------------------------------------------------------------------------"
echo "please see https://github.com/box/box-content-preview/pull/1466 and make sure your version of pdf.js includes this fix"
echo "------------------------------------------------------------------------------------"
