Box.Preview
============

Clone and compile
-----------------

1. `git clone git@gitenterprise.inside-box.net:Preview/Preview.git`
2. `cd Preview`
3. `npm install`
4. `npm run build`
 
While developing
----------------

1. `npm run props2js` to generate resource bundles if needed
2. `npm run webpack` (or `npm run watch`) to generate webpak bundles

Run
---

See `demo` folder for `image.html` or `images.html` etc which has examples from individual encapsulated viewers. This won't be the common use case however and most clients including the webapp will use the preview.js wrapper.

    var image = new Box.Image('.container');
    image.load('/url/to/image').then(function() { ... });

OR see `index.html` where preview.js wrapper is used instead of directly using the individual viewers.

    Box.Preview.show(X, Y, container, { options }).then(function(viewer) {
        // do something with the viewer object if needed
    });

where
* `X` is either a string file Id OR JSON file object response from https://box-content.readme.io/reference#files
* `Y` is either an array of string file ids OR an array of JSON file objects from the content api as shown above.
* `container` is either a DOM node or CSS selector where the preview will be shown
* `options` is an object listing the CDN, auth token and user's locale


`index.html` is hardcoded to test against `https://app.phora.inside-box.net` where I am usinf the content API endpoint returning the JSON `file` structure. You will have to launch chrome by disabling security so that CORS issues don't happen -

    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --disable-web-security

Test
----

1. `npm run karma`
2. open `index.html` in `coverage\`
