Box.Preview
============

Clone and compile
-----------------

1. `git clone git@gitenterprise.inside-box.net:Preview/Preview.git`
2. `cd Preview`
3. `npm install`
4. `npm run props2js` to generate resource bundles
4. `npm run webpack` (or `npm run watch`)

Run
---

See `demo` forder for `image.html` or `images.html` etc where individual encapsulated viewers are used. This won't be the common use case however and most clients including the webapp will use the preview.js wrapper.

    var image = new Box.Image('.container');
    image.load('/url/to/image').then(function() { ... });

OR see `index.html` where preview.js wrapper is used instead of directly using the individual viewers.

    Box.Preview.show(fileId [or array of file ids], container, options).then(function(imageViewer) {
        ...
    });

where the fileId (currently using shared names for anonymous access) fetch will return

    file = {
        locale: 'en-US',
        type: 'image',
        representations: [
            'path/to/representation'
        ]
    };

`index.html` is hardcoded to test against `https://app.phora.inside-box.net` where I have a webapp endpoint (http://scm.dev.box.net:8080/#/c/212681/) returning the above `file` structure. You will have to launch chrome by disabling security so that CORS issues don't happen -

    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --disable-web-security

Test
----

1. `npm run karma`
2. open `index.html` in `coverage\`
