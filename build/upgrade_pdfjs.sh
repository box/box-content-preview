#!/bin/bash
# Run with specific version (e.g. ./upgrade_pdfjs.sh <version>)

#IMPORTANT!!!! See https://github.com/box/box-content-preview/pull/1466 and make sure any updated version of pdf.js includes
#this fix or fixes it on it's own

DOC_STATIC_ASSETS_PDFJS_VERSION=${1}
DOC_STATIC_ASSETS_VERSION=$(./build/current_version.sh)
DOC_STATIC_ASSETS_PATH="src/third-party/doc/${DOC_STATIC_ASSETS_VERSION}"

echo "Upgrading pdf.js to $DOC_STATIC_ASSETS_BRANCH";

echo "-----------------------------------------------------------------------------------"
echo "Cleaning up existing upgrade files/folders if they exist..."
echo "-----------------------------------------------------------------------------------"
rm -rf ${DOC_STATIC_ASSETS_PATH}
rm -rf pdfjs-dist
rm pdfjs-dist.zip

DOC_CURRENT_ASSETS_VERSIONS=`ls src/third-party/doc | sort -t "." -k1,1n -k2,2n -k3,3n | tail -1`

echo "-----------------------------------------------------------------------------------"
echo "Creating target directory at $DOC_STATIC_ASSETS_PATH..."
echo "-----------------------------------------------------------------------------------"
mkdir ${DOC_STATIC_ASSETS_PATH}

echo "-----------------------------------------------------------------------------------"
echo "Copying legacy files/folders from version ${DOC_CURRENT_ASSETS_VERSIONS}..."
echo "-----------------------------------------------------------------------------------"
\cp -R src/third-party/doc/${DOC_CURRENT_ASSETS_VERSIONS}/exif.js ${DOC_STATIC_ASSETS_PATH}/
\cp -R src/third-party/doc/${DOC_CURRENT_ASSETS_VERSIONS}/exif.min.js ${DOC_STATIC_ASSETS_PATH}/
\cp -R src/third-party/doc/${DOC_CURRENT_ASSETS_VERSIONS}/images ${DOC_STATIC_ASSETS_PATH}/images

echo "-----------------------------------------------------------------------------------"
echo "Downloading pdf.js files and placing them in third-party directory..."
echo "-----------------------------------------------------------------------------------"
# pdf_viewer is not included in the pdf.js build so we get it from a cdn
curl https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdf.min.mjs -o ${DOC_STATIC_ASSETS_PATH}/pdf.min.mjs
curl https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdf.worker.mjs -o ${DOC_STATIC_ASSETS_PATH}/pdf.worker.min.mjs
curl https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdf_viewer.mjs -o ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.mjs
curl https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdf_viewer.min.css -o ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.min.css

echo "-----------------------------------------------------------------------------------"
echo "Minifying pdf_viewer.mjs and outputting to thrid-party directory with terser..."
echo "-----------------------------------------------------------------------------------"
TERSER_ARGS=(--comments false -c sequences=false -m reserved=['__webpack_exports__'] --keep-classnames --keep-fnames --module)
yarn run terser ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.mjs -o ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.min.mjs --comments false -c sequences=false -m reserved=['__webpack_exports__'] --keep-classnames --keep-fnames --module
rm ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.mjs

echo "-----------------------------------------------------------------------------------"
echo "Downloading and copying cmaps to third-party directory..."
echo "-----------------------------------------------------------------------------------"
curl -L https://github.com/mozilla/pdf.js/releases/download/v${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdfjs-${DOC_STATIC_ASSETS_PDFJS_VERSION}-dist.zip -o pdfjs-dist.zip
unzip -q -d pdfjs-dist pdfjs-dist.zip
\cp -rf pdfjs-dist/web/cmaps ${DOC_STATIC_ASSETS_PATH}/cmaps
rm -rf pdfjs-dist
rm pdfjs-dist.zip

echo "-----------------------------------------------------------------------------------"
echo "Successfully updated pdf.js files!"
echo "-----------------------------------------------------------------------------------"

echo "------------------------------------------------------------------------------------"
echo "please see https://github.com/box/box-content-preview/pull/1466 and make sure your version of pdf.js includes this fix"
echo "------------------------------------------------------------------------------------"
