#!/bin/bash
# Run with specific version (e.g. ./upgrade_pdfjs.sh <version>)

#IMPORTANT!!!! Make sure apply the updates in the verify_custom_updates.sh script and remove them
# if they are no longer necessary.

DOC_STATIC_ASSETS_PDFJS_VERSION=${1}
DOC_STATIC_ASSETS_VERSION=$(./build/current_version.sh)
DOC_STATIC_ASSETS_PATH="src/third-party/doc/${DOC_STATIC_ASSETS_VERSION}"
CURL_PATH="https://cdn.jsdelivr.net/npm/pdfjs-dist@${DOC_STATIC_ASSETS_PDFJS_VERSION}/legacy"

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
\cp -R src/third-party/doc/${DOC_CURRENT_ASSETS_VERSIONS}/exif-reader.min.js ${DOC_STATIC_ASSETS_PATH}/
\cp -R src/third-party/doc/${DOC_CURRENT_ASSETS_VERSIONS}/exif.min.js ${DOC_STATIC_ASSETS_PATH}/
\cp -R src/third-party/doc/${DOC_CURRENT_ASSETS_VERSIONS}/images ${DOC_STATIC_ASSETS_PATH}/images

echo "-----------------------------------------------------------------------------------"
echo "Downloading pdf.js files and placing them in third-party directory..."
echo "-----------------------------------------------------------------------------------"
curl ${CURL_PATH}/build/pdf.mjs -o ${DOC_STATIC_ASSETS_PATH}/pdf.mjs
curl ${CURL_PATH}/build/pdf.worker.mjs -o ${DOC_STATIC_ASSETS_PATH}/pdf.worker.mjs
curl ${CURL_PATH}/web/pdf_viewer.mjs -o ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.mjs
curl ${CURL_PATH}/web/pdf_viewer.min.css -o ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.min.css

# We minify the files ourself to avoid the cdn incorrectly minifying the files.
# We use the terser options defined by pdf.js here:
# https://github.com/mozilla/pdf.js/blob/ea34e5ccf6fdc7b3efcf6eba5b937dc7d63c5961/gulpfile.mjs#L345-L359
echo "-----------------------------------------------------------------------------------"
echo "Minifying pdf.js files using terser..."
echo "-----------------------------------------------------------------------------------"
TERSER_ARGS=(--comments false -c sequences=false -m reserved=['__webpack_exports__'] --keep-classnames --keep-fnames --module)
yarn run terser ${DOC_STATIC_ASSETS_PATH}/pdf.mjs -o ${DOC_STATIC_ASSETS_PATH}/pdf.min.mjs ${TERSER_ARGS[@]}
yarn run terser ${DOC_STATIC_ASSETS_PATH}/pdf.worker.mjs -o ${DOC_STATIC_ASSETS_PATH}/pdf.worker.min.mjs ${TERSER_ARGS[@]}
yarn run terser ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.mjs -o ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.min.mjs ${TERSER_ARGS[@]}

echo "-----------------------------------------------------------------------------------"
echo "Cleaning up un-minified pdf.js files..."
echo "-----------------------------------------------------------------------------------"
rm ${DOC_STATIC_ASSETS_PATH}/pdf.mjs
rm ${DOC_STATIC_ASSETS_PATH}/pdf.worker.mjs
rm ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.mjs

# we get the cmaps from the prebuild rather than the cdn because we would have to web scrape the cdn in order to get the cmap file names.
# We don't use the prebuild for the pdf.js files because it doesn't include pdf_viewer
echo "-----------------------------------------------------------------------------------"
echo "Downloading and copying cmaps to third-party directory..."
echo "-----------------------------------------------------------------------------------"
curl -L https://github.com/mozilla/pdf.js/releases/download/v${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdfjs-${DOC_STATIC_ASSETS_PDFJS_VERSION}-legacy-dist.zip -o pdfjs-dist.zip
unzip -q -d pdfjs-dist pdfjs-dist.zip
\cp -rf pdfjs-dist/web/cmaps ${DOC_STATIC_ASSETS_PATH}/cmaps
rm -rf pdfjs-dist
rm pdfjs-dist.zip

echo "-----------------------------------------------------------------------------------"
echo "Successfully updated pdf.js files!"
echo "-----------------------------------------------------------------------------------"
