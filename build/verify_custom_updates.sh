#!/bin/bash

VERSION="`grep -o 'DOC_STATIC_ASSETS_VERSION.*' ./src/lib/constants.js | grep -o "'.*'" | sed -e "s/'//g"`"
EXTERNAL_LINK_FIX_MISSING="`grep -c 'this instanceof WidgetAnnotationElement||(a.tabIndex=r);const{style:o}=a;o.zIndex=this.parent.zIndex++;' ./src/third-party/doc/$VERSION/pdf.min.mjs`"
FAILED=false

if [[ $EXTERNAL_LINK_FIX_MISSING != 0 ]];then
     echo "-----------------------------------------"
        echo "External link fix not implemented."
        echo "Verify that the fix is still needed by loading a pdf with multiple external links and confirm the first one is clickable."
        echo "To fix, run: sed -i '' -e 's/this instanceof WidgetAnnotationElement||(a.tabIndex=r);const{style:o}=a;o.zIndex=this.parent.zIndex++;/this instanceof WidgetAnnotationElement||(a.tabIndex=r);const{style:o}=a;o.zIndex=++this.parent.zIndex;/' ./src/third-party/doc/${VERSION}/pdf.min.mjs"
        echo "------------------------------------------"
fi

if [[ $FAILED == true ]];then
exit 1
fi

exit 0
