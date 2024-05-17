#!/bin/bash
# Run with specific branch/tag (e.g. ./upgrade_pdfjs.sh tags/v2.2.228) or with no arguments to use master

#IMPORTANT!!!! See https://github.com/box/box-content-preview/pull/1466 and make sure any updated version of pdf.js includes
#this fix or fixes it on it's own


DOC_STATIC_ASSETS_PDFJS_VERSION=${1}
DOC_STATIC_ASSETS_PATH="src/third-party/doc/${DOC_STATIC_ASSETS_PDFJS_VERSION}"
if  [[ ${1:0:1} -ge "4" ]]; then JS_FILE_EXTENSION="mjs"; else JS_FILE_EXTENSION="js"; fi

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
\cp -R src/third-party/doc/${DOC_CURRENT_ASSETS_VERSIONS}/cmaps ${DOC_STATIC_ASSETS_PATH}/cmaps
echo "-----------------------------------------------------------------------------------"
echo "Copying relevant files to third-party directory..."
echo "-----------------------------------------------------------------------------------"

curl https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdf.${JS_FILE_EXTENSION} -o  ${DOC_STATIC_ASSETS_PATH}/pdf.${JS_FILE_EXTENSION}
curl https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdf.min.${JS_FILE_EXTENSION} -o  ${DOC_STATIC_ASSETS_PATH}/pdf.min.${JS_FILE_EXTENSION}
curl https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdf.worker.${JS_FILE_EXTENSION} -o  ${DOC_STATIC_ASSETS_PATH}/pdf.worker.${JS_FILE_EXTENSION}
curl https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdf.worker.min.${JS_FILE_EXTENSION} -o  ${DOC_STATIC_ASSETS_PATH}/pdf.worker.min.${JS_FILE_EXTENSION}
curl https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdf_viewer.css -o  ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.css
curl https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdf_viewer.min.css -o  ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.min.css
curl https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdf_viewer.${JS_FILE_EXTENSION} -o  ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.${JS_FILE_EXTENSION}
curl https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdf_viewer.min.${JS_FILE_EXTENSION} -o  ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.min.${JS_FILE_EXTENSION}

# # Decreased default cached pages size to 5 on mobile web to lower memory usage
# echo "-----------------------------------------------------------------------------------"
# echo "Decreasing # of cached pages on mobile web..."
# echo "-----------------------------------------------------------------------------------"
sed -e 's@var DEFAULT_CACHE_SIZE = 10;@var DEFAULT_CACHE_SIZE = /iphone|ipad|ipod|android|blackberry|bb10|mini|windows\sce|palm/i.test(navigator.userAgent) ? 5 : 10;@' -i '' ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.${JS_FILE_EXTENSION}

# # Render e-signatures without validation
# echo "-----------------------------------------------------------------------------------"
# echo "Enabling e-signature rendering without validation..."
# echo "-----------------------------------------------------------------------------------"
sed -e 's@;r.setFlags(o.AnnotationFlag.HIDDEN)@@' -i '' ${DOC_STATIC_ASSETS_PATH}/pdf.worker.min.${JS_FILE_EXTENSION}


# echo "-----------------------------------------------------------------------------------"
# echo "Successfully updated pdf.js files!"
# echo "-----------------------------------------------------------------------------------"

# echo "------------------------------------------------------------------------------------"
# echo "please see https://github.com/box/box-content-preview/pull/1466 and make sure your version of pdf.js includes this fix"
# echo "------------------------------------------------------------------------------------"
