Image Previewer
===============

Clone and compile
-----------------

1. `git clone git@gitenterprise.inside-box.net:Preview/image.git`
2. `cd image`
3. `npm install`
4. `npm run browserify` (or `npm run watchify`)

Run
---

	var image = new Box.Image('.container');
	image.load('/url/to/image').then(function() { ... });

Example inside `index.html` with required assets.

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
