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
1. `npm run props2js` to generate resource bundles if needed
2. `npm run dev` (or `npm run watch`) to generate webpak bundles

Release build
--------------
`npm run release`

Run
---
* There is a small barebone express server that can be run as `node server.js`
* Once the server is running visit http://localhost:9898/ which serves a demo page `demo/index.html`
* Grab an auth token from `https://app.<yourdomain>.inside-box.net/developers/services` by creating a dummy box application for yourself and use this token on the demo page. Press the load button. You only need to enter the auth token once every hour, pressing the load button should use a prior entered token.

In this demo `index.html` file you will see how preview.js is used:

```javascript
Box.Preview.show(X, Y, container, { options }).then(function(viewer) {
    // do something with the viewer object if needed
});
```

where
* `X` is either a string file id OR JSON file object response from https://box-content.readme.io/reference#files
* `Y` is either an array of string file ids OR an array of JSON file objects from the content api as shown above.
* `container` is either a DOM node or CSS selector where the preview will be shown
* `options` is an object listing the CDN, auth token and user's locale

If you get CORS issues due to localhost, you will have to launch chrome by disabling security -
`/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --disable-web-security`

Test
----

1. `npm run karma`
2. open `index.html` in `coverage\`

foo bar baz

