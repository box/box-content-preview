# Running tests locally

## Saucelabs
1) Download the [saucelabs proxy](https://wiki.saucelabs.com/display/DOCS/Sauce+Connect+Proxy)
2) Run ```yarn functional-tests``` to start a local server on localhost:8000
3) Run the proxy ```./bin/sc -u SAUCELABS_USER_NAME -k SAUCELABS_ACCESS_KEY -N -i test``` to allow saucelabs to access your localhost
4) Run the tests
```SAUCE_USERNAME=SAUCELABS_USER_NAME SAUCE_ACCESS_KEY=SAUCELABS_ACCESS_KEY TRAVIS_JOB_NUMBER=TUNNEL_ID node ./node_modules/codeceptjs/bin/codecept.js run --verbose``` where SAUCE_USERNAME, SAUCELABS_ACCESS_KEY can be found in saucelabs website. TUNNEL_ID is a unique identifier such as your username.

## local selenium and browser testing (without saucelabs)
Make sure selenium webdriver is running and run ```node ./node_modules/codeceptjs/bin/codecept.js run --verbose```
