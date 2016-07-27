echo '---------------------------------'
echo 'Cleaning up tests'
echo '---------------------------------'
find src/lib -depth -name '*-test.js.bak' -execdir bash -c 'mv "$0" "${0//-test.js.bak/-test.js}"' {} \;
find src/lib -depth -name '*-test.html.bak' -execdir bash -c 'mv "$0" "${0//-test.html.bak/-test.html}"' {} \;
