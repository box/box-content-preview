# Minify using Google Closure Compiler, options:
# Output to ECMASCRIPT5 / ES5 (Box supports Chrome, IE11, Firefox, Safari, and newer versions of iOS, Android)
# Skip rewriting polyfills since pdf.js includes its own WeakMap polyfill
echo "-----------------------------------------------------------------------------------"
echo "Minifying pdf.js files with Google Closure... Warnings are okay!"
echo "-----------------------------------------------------------------------------------"
java -jar build/closure-compiler-v20161201.jar --rewrite_polyfills false --language_out ECMASCRIPT5 --js src/third-party/doc/pdf.js --js_output_file src/third-party/doc/pdf.min.js
java -jar build/closure-compiler-v20161201.jar --rewrite_polyfills false --language_out ECMASCRIPT5 --js src/third-party/doc/pdf.worker.js --js_output_file src/third-party/doc/pdf.worker.min.js
java -jar build/closure-compiler-v20161201.jar --rewrite_polyfills false --language_out ECMASCRIPT5 --js src/third-party/doc/pdf_viewer.js --js_output_file src/third-party/doc/pdf_viewer.min.js
java -jar build/closure-compiler-v20161201.jar --rewrite_polyfills false --language_out ECMASCRIPT5 --js src/third-party/doc/compatibility.js --js_output_file src/third-party/doc/compatibility.min.js
echo "-----------------------------------------------------------------------------------"
echo "Successfully updated and minified pdf.js files!"
echo "-----------------------------------------------------------------------------------"
