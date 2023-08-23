#!/bin/bash

VERSION="`grep -o 'DOC_STATIC_ASSETS_VERSION.*' ./src/lib/constants.js | grep -o "'.*'" | sed -e "s/'//g"`"
PIXEL_FIX_MISSING="`grep -c '.PixelsPerInch.PDF_TO_CSS_UNITS);return void 0!==' ./src/third-party/doc/$VERSION/pdf.min.js`"
READ_ONLY_FIELD_FIX="`grep -c 'class TextWidgetAnnotation extends WidgetAnnotation{constructor(e){super(e);this.data.hasOwnCanvas=this.data.readOnly' ./src/third-party/doc/$VERSION/pdf.worker.min.js`"
FAILED=false
if [[ $PIXEL_FIX_MISSING != 0 ]];then
    echo "Pixelation fix not implemented. See https://github.com/box/box-content-preview/pull/1466"
    FAILED=true
fi

if [[ $READ_ONLY_FIELD_FIX != 0 ]];then
    echo "Read only form field fix not implemented."
    FAILED=true
fi

if [[ $FAILED == true ]];then
exit 1
fi

exit 0
