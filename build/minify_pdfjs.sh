DOC_STATIC_ASSETS_VERSION=$(./build/current_version.sh)

# Minify using Google Closure Compiler, options:
# Output to ECMASCRIPT5 / ES5 (Box supports Chrome, IE11, Firefox, Safari, and newer versions of iOS, Android)
# Skip rewriting polyfills since pdf.js includes its own WeakMap polyfill
echo "-----------------------------------------------------------------------------------"
echo "Minifying pdf.js files with Google Closure... Warnings are okay!"
echo "-----------------------------------------------------------------------------------"
java -jar build/closure-compiler-v20161201.jar --rewrite_polyfills false --language_out ECMASCRIPT5 --js src/third-party/doc/$DOC_STATIC_ASSETS_VERSION/pdf.js --js_output_file src/third-party/doc/$DOC_STATIC_ASSETS_VERSION/pdf.min.js

java -jar build/closure-compiler-v20161201.jar --rewrite_polyfills false --language_out ECMASCRIPT5 --js src/third-party/doc/$DOC_STATIC_ASSETS_VERSION/pdf.worker.js --js_output_file src/third-party/doc/$DOC_STATIC_ASSETS_VERSION/pdf.worker.min.js

java -jar build/closure-compiler-v20161201.jar --rewrite_polyfills false --language_out ECMASCRIPT5 --js src/third-party/doc/$DOC_STATIC_ASSETS_VERSION/pdf_viewer.js --js_output_file src/third-party/doc/$DOC_STATIC_ASSETS_VERSION/pdf_viewer.min.js
echo "-----------------------------------------------------------------------------------"
echo "Minifying pdf.js CSS with cssnano"
echo "-----------------------------------------------------------------------------------"
./node_modules/.bin/cssnano src/third-party/doc/$DOC_STATIC_ASSETS_VERSION/pdf_viewer.css src/third-party/doc/$DOC_STATIC_ASSETS_VERSION/pdf_viewer.min.css
echo "-----------------------------------------------------------------------------------"
echo "Successfully updated and minified pdf.js files!"
echo "-----------------------------------------------------------------------------------"
