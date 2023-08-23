#!/bin/bash
# Run with specific branch/tag (e.g. ./upgrade_pdfjs.sh tags/v2.2.228) or with no arguments to use master

#IMPORTANT!!!! See https://github.com/box/box-content-preview/pull/1466 and make sure any updated version of pdf.js includes
#this fix or fixes it on it's own


DOC_STATIC_ASSETS_PDFJS_VERSION=${1}
DOC_STATIC_ASSETS_VERSION=$(./build/current_version.sh)
DOC_STATIC_ASSETS_PATH="src/third-party/doc/${DOC_STATIC_ASSETS_PDFJS_VERSION}"

echo "Upgrading pdf.js to $DOC_STATIC_ASSETS_PDFJS_VERSION";

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

curl https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdf.js -o  ${DOC_STATIC_ASSETS_PATH}/pdf.js
curl https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdf.min.js -o  ${DOC_STATIC_ASSETS_PATH}/pdf.min.js
curl https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdf.worker.js -o  ${DOC_STATIC_ASSETS_PATH}/pdf.worker.js
curl https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdf.worker.min.js -o  ${DOC_STATIC_ASSETS_PATH}/pdf.worker.min.js
curl https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdf_viewer.css -o  ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.css
curl https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdf_viewer.min.css -o  ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.min.css
curl https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdf_viewer.js -o  ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.js
curl https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${DOC_STATIC_ASSETS_PDFJS_VERSION}/pdf_viewer.min.js -o  ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.min.js

# # Decreased default cached pages size to 5 on mobile web to lower memory usage
# echo "-----------------------------------------------------------------------------------"
# echo "Decreasing # of cached pages on mobile web..."
# echo "-----------------------------------------------------------------------------------"
sed -e 's@var DEFAULT_CACHE_SIZE = 10;@var DEFAULT_CACHE_SIZE = /iphone|ipad|ipod|android|blackberry|bb10|mini|windows\sce|palm/i.test(navigator.userAgent) ? 5 : 10;@' -i '' ${DOC_STATIC_ASSETS_PATH}/pdf_viewer.js

# # Render e-signatures without validation
# echo "-----------------------------------------------------------------------------------"
# echo "Enabling e-signature rendering without validation..."
# echo "-----------------------------------------------------------------------------------"
sed -e 's@;r.setFlags(o.AnnotationFlag.HIDDEN)@@' -i '' ${DOC_STATIC_ASSETS_PATH}/pdf.worker.min.js


# # Fix pdf.js issue with disappearing form data
sed -i '' -e 's/class TextWidgetAnnotation extends WidgetAnnotation{constructor(e){super(e);this.data.hasOwnCanvas=this.data.readOnly&&!this.data.noHTML/class TextWidgetAnnotation extends WidgetAnnotation{constructor(e){super(e);this.data.hasOwnCanvas=false/' ${DOC_STATIC_ASSETS_PATH}/pdf.worker.min.js


echo "-----------------------------------------------------------------------------------"
echo "Successfully updated pdf.js files!"
echo "-----------------------------------------------------------------------------------"

echo "------------------------------------------------------------------------------------"
echo "please see https://github.com/box/box-content-preview/pull/1466 and make sure your version of pdf.js includes this fix"
echo "------------------------------------------------------------------------------------"
