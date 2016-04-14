echo '---------------------------------'
echo 'Running test ' $1'-test.js'
echo '---------------------------------'
find src/lib -depth -name '*-test.js' ! -name $1'-test.js' -execdir bash -c 'mv "$0" "${0//-test.js/-test.js.bak}"' {} \;
npm run coverage;
find src/lib -depth -name '*-test.js.bak' -execdir bash -c 'mv "$0" "${0//-test.js.bak/-test.js}"' {} \;

