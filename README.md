Image Previewer
===============

Clone and compile
-----------------

1. `git clone git@gitenterprise.inside-box.net:Preview/image.git`
2. `cd image`
3. `npm install`
4. `npm run props2js` to generate resource bundles
4. `npm run webpack` (or `npm run watch`)

Run
---

See `image.html` or `images.html`

    var image = new Box.Image('.container');
    image.load('/url/to/image').then(function() { ... });

OR

See `index.html`

    Box.Preview.show(file, container, assets, options).then(function(imageViewer) {
        ...
    });

where

    file = {
        type: 'image',
        representations: [
                'path/to/representation'
            ]
        };

    assets = {
        image: {
            stylesheets: [
                'path/to/css'
            ],
            scripts: [
                'path/to/js'
            ]
        }
    };


API
---
* on('eventname', callback)
* off('eventname', callback)
* zoomIn()
* zoomOut()
* rotateLeft()
* toggleFullscreen()

Events
------
* resize
* rotate
* pan
* panstart
* panend
* enterfullscreen
* exitfullscreen

Test
----

1. `npm run karma`
2. open `index.html` in `coverage\`
