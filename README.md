Box.Preview
============

Clone and compile
-----------------
1. `git clone git@gitenterprise.inside-box.net:Preview/Preview.git`
2. `cd Preview`
3. `npm install`
4. `npm run build` (does a clean build)
 

While developing
----------------
1. `npm run props2js` to generate resource bundles (only if needed)
2. `npm run dev` (or `npm run watch`) to generate webpack bundles


Release build
--------------
`npm run release`


Run the demo files app locally
------------------------------
Due to restrictions in the browser as well as the content API, we need to workaround a few things to get everything working, specifically CORS.

1. ###### Create a new self-signed SSL certificate for yourself by running the following command in your home directory
`openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365`

2. ###### Remove pass phrase from that above self signed certificate
`openssl rsa -in key.pem -out newkey.pem && mv newkey.pem key.pem`

3. ###### Add the ~/cert.pem generated above to your OSX keychain
  * This will prevent Chrome from complaining about bad SSL certs.
  * Once you add it to the OSX keychain, open it and change the trust section to `Always Trust` for your cert.

4. ###### Add some custom domain name to /preview/etc/hosts
  * Add `127.0.0.1 preview.com` or whatever name you want.
  * This is needed because Chrome does not allow CORS on localhost without disabling its web security

5. ###### Create a new box api application
  1. Go to `https://app.your-dev-domain.inside-box.net/developer/services`
  2. Create Box Application
  3. Give it any name and choose `Box Content`
  4. Once created make a note of your API key shown at the bottom under Backend Parameters
  5. Also create a developer token by clicking `Create Developer Token`
    * You will have to create a fresh new token every hour
    * Remember to create and use a new token once you end up with a 401 Unauthorized

6. ###### Add you domain from above to the whitelist for content API
  1. Log into your dev box as `admin_swat` / `12345678!`
  2. Go to `https://app.your-dev-domain.inside-box.net/developer/services/edit/api-key-from-step-5.4`
  3. Search for CORS on the page and add `https://preview.com` or whatever domain you chose in step 4.
  4. Save.

7. ###### Run the small barebone express server `node server.js`
  * This will use your certs and serve the demo

8. ###### Go to `https://preview.com` or whatever domain you chose in step 4.

9. ###### Enter the details and the auth token from step 5.5
  * You will need to refresh this token every hour.
  * Local API host is `https://app.your-dev-domain.inside-box.net/api`
  * Public API host is `https://api.box.com`
  * Shared folder url is for any folder whose files you want to fetch.


Demo details
------------
In this demo `demo/index.html` `demo/js/files-app.js` `demo/js/files-app.js` you will see how preview.js is used:

```javascript
Box.Preview.show(X, Y, container, { options }).then(function(viewer) {
    // do something with the viewer object if needed
});
```
where
* `X` is either a string file id OR JSON file object response from https://box-content.readme.io/reference#files
* `Y` is either an array of string file ids OR an array of JSON file objects from the content api as shown above.
* `container` is either a DOM node or CSS selector where the preview will be shown
* `options` is an object listing the API host, CDN, auth token and user's locale


Test
----

1. `npm run karma`
2. open `index.html` in `coverage\`
