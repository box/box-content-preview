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


Demo and testing local changes
------------------------------
https://gitenterprise.inside-box.net/Preview/demo


API
---

```javascript
Box.Preview.show(file, { options }).then(function(viewer) {
    // do something with the viewer object if needed
});
```
where
* `file` is either a string file id OR JSON file object response from https://box-content.readme.io/reference#files
* `options` is an object with the following attribute
  * (required) `api` is the api host.
  * (required) `token` is the api auth token.
  * (optional) `files` is either an array of string file ids OR an array of JSON file objects from the content api as shown above.
  * (optional) `container` is the container dom node for preview. Can be a selector or html node.


Test
----

1. `npm run karma`
2. open `index.html` in `coverage\`


Run the demo files app locally (deprecated, use the demo link above)
--------------------------------------------------------------------
NOTE: Use the above demo link for testing purposes. Only do the stuff below if you really want to go through all the steps. Will remove these steps once https://jira.inside-box.net/browse/SRE-7366 is fixed.

The following steps allow you to run this app locally from your machine without the need of dev VM. Its the best for development too. Due to security restrictions in the browser as well as the content API, we need to workaround a few things to get everything working, specifically CORS.

1. ###### Choose and add some custom domain name to /private/etc/hosts
  * Add `127.0.0.1 preview.com` or `127.0.0.1 foobar.com` or whatever domain name you want. This name will be used in step 2 and will be the app home.
  * This is needed because Chrome does not allow CORS on localhost without disabling its web security

2. ###### Create a new self-signed SSL certificate for yourself by running the following command in your home directory
`openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365`
  * When prompted used the same domain as step 1.
  * Make sure the generated key and cert are in your home directory as it will be used by step 7 from that location.
  * SSL cert is needed for https, which in turn is mandatory to enable CORS in step 6 by whitelisting our chosen domain.

3. ###### Remove pass phrase from that above self signed certificate
`openssl rsa -in key.pem -out newkey.pem && mv newkey.pem key.pem`

4. ###### Add the ~/cert.pem generated above to your OSX keychain by double clicking the cert.pem file in your home folder.
  * This will prevent Chrome from complaining about bad SSL certs.
  * Once you add it to the OSX keychain, open it and change the trust section to `Always Trust` for your cert.
    1. Open keychain.
    2. Find your cert (can be under login or system section) and open it.
    3. Uncollapse the `Trust` section on top.
    4. Choose `Always Trust` from the 1st drop down select.

5. ###### Create a new box api application
  1. Go to `https://app.your-dev-domain.inside-box.net/developer/services`
  2. Create a `Box Application`
  3. Give it any name and choose `Box Content`
  4. Press configure application.
  5. Once created make a note of your API key shown at the bottom under `Backend Parameters`
  6. At the same time create a developer token by clicking `Create Developer Token`
    * You will have to repeat this step and create a fresh new token every hour.
    * Use a new token once you end up with a 401 Unauthorized while developing.

6. ###### Add you domain from above to the whitelist for content API
  1. Log into your dev box as `admin_swat` / `12345678!`
  2. Go to `https://app.your-dev-domain.inside-box.net/developer/services/edit/api-key-from-step-5.4`
  3. Search for CORS on the page and add `https://preview.com` or whatever domain you chose in step 1.
  4. Save Application.
  5. If you get an error for the redirect_uri, use the same domain for that field as the CORS field.

7. ###### Run the small barebone express server `sudo node server.js`
  * This will use your certs from step 2 and serve the demo.
  * sudo is needed because it will listen on port 443 which is a reserved system port.

8. ###### Go to `https://preview.com` or whatever domain you chose in step 1.

9. ###### Enter the details and the auth token from step 5.5
  * You will need to refresh this token every hour.
  * Local API host is `https://app.your-dev-domain.inside-box.net/api`
  * Public API host is `https://api.box.com`
  * Shared folder url is for any folder whose files you want to fetch.

