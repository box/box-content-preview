echo '-----------------------------------------------------------'
echo 'Running test ' $1'-test.js'
echo 'Please run `npm run test-cleanup` after debugging!'
echo '-----------------------------------------------------------'
find src/lib -depth -name '*-test.js' ! -name $1'-test.js' -execdir bash -c 'mv "$0" "${0//-test.js/-test.js.bak}"' {} \;
find src/lib -depth -name '*-test.html' ! -name $1'-test.html' -execdir bash -c 'mv "$0" "${0//-test.html/-test.html.bak}"' {} \;
TEST_ENV=single-file npm run test-dev;
find src/lib -depth -name '*-test.js.bak' -execdir bash -c 'mv "$0" "${0//-test.js.bak/-test.js}"' {} \;
find src/lib -depth -name '*-test.html.bak' -execdir bash -c 'mv "$0" "${0//-test.html.bak/-test.html}"' {} \;
