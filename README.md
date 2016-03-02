Box Preview
============

Overview
---------
The Box Preview library allows developers to preview their Box file(s) in an application. The library fetches representations through the Box Content API, chooses the appropriate viewer for the file type and finally renders the preview. The library also allows back and forth navigation for previewing of multiple files.

Browser Support
----------------
* Chrome, Firefox, Safari and Edge.
* Limited support on Internet Explorer 10+.

The browser needs to have the Promise API implimented. If not, it can be polyfilled by including a promise library like bluebird before any other script includes: https://cdn.jsdelivr.net/bluebird/3.3.1/bluebird.min.js

Latest version hosted on CDN
-----------------------------
* Version: 0.45.0
* Locale: en-US

https://cdn01.boxcdn.net/content-experience/0.45.0/en-US/preview.js
https://cdn01.boxcdn.net/content-experience/0.45.0/en-US/preview.css

Usage
------
```html
<!DOCTYPE html>
<html lang="en-US">
<head>
    <meta charset="utf-8" />
    <title>Preview API Sample</title>

    <!-- Polyfill promise API if using Internet Explorer -->
    <script src="//cdn.jsdelivr.net/bluebird/3.3.1/bluebird.min.js"></script>

    <!-- version 0.45.0 of preview library for locale en-US -->
    <script src="//cdn01.boxcdn.net/content-experience/0.45.0/en-US/preview.js"></script>
    <link rel="stylesheet" href="//cdn01.boxcdn.net/content-experience/0.45.0/en-US/preview.css" />
</head>
<body>
    <div class="preview-container" style="width:500px; height:212px;"></div>
    <script>
        Box.Preview.show('47108636521', {
            token: '1RVukPh5RkL23BEZqgbxc0xEowBthwGP',
    	    container: '.preview-container'
        });
    </script>
</body>
</html>
```

Clone and compile
------------------
1. `git clone git@gitenterprise.inside-box.net:Preview/Preview.git`
2. `cd Preview`
3. `npm install`
4. `npm run build` (builds resource bundles and does a clean build)

*Note: If you get a rsync error while running the build for the 1st time, it probably failed to copy the built assets to your dev VM. In that case go to your dev VM and manually create the folder `/box/www/assets/content-experience` and give it 777 permissions. This folder acts as your static server for local development.*


While developing
-----------------
Install SCSS linter `gem install scss_lint` for linting SCSS files.

* `npm run build` to generate resource bundles and JS webpack bundles.
* `npm run watch` to only generate JS webpack bundles on file changes.
* `npm run test` launches karma tests with chrome browser to debug tests.
* `npm run coverage` launches karma tests with PhantomJS and dumps coverage inside `reports\coverage`.

*For more script commands see `package.json`*

Release build
--------------
`npm run release` does a release build.


Demo and testing local changes
-------------------------------
https://gitenterprise.inside-box.net/Preview/demo


API
---

The recommended way to show a preview is by calling `Box.Preview.show(fileId, { options })` where fileId is a `Box_File` id. `Box.Preview` is an instance of the class `Preview`. Another way to show a preview or multiple previews on the same page is by creating instances of the `Preview` class as follows:

```javascript
let preview = new Preview();
preview.show(fileId, { options });
```

{ options }
------------

```javascript
{
    token: 'api auth token',
    container: '.preview-container', // optional dom node or selector where preview should be placed
    api: 'https://api.box.com',      // optional api host like https://ldap.dev.box.net/api
    files: [ '123', '234', ... ],    // optional list of file ids for back and forth navigation
    header: true,                    // optional boolean to turn the header on or off
    viewers: {                       // optional arguments to pass on to viewers
        VIEWERNAME: {                   // name of the viewer
            disabled: false,            // disables the viewer
            annotations: false          // other args
            controls: true              // disables the viewer controls
            ...
        },
        ...
    }
}
```

VIEWERNAME can be one of the following `Document`, `Presentation`, `MP3`, `MP4`, `Dash`, `Image`, `Text`, `SWF`, `Image360`, `Video360`, `Model3d`, `CSV`, `Markdown`. This list of viewers can also be gotten by calling `Box.Preview.getViewers()`.

`Box.Preview.hide(/* optional Boolean */ destroy)` hides the previewer. If destroy is true, then container's contents are also removed.

`Box.Preview.updateAuthToken(/* String */ token);` updates the API auth token. Useful for when the token expires.

`Box.Preview.getCurrentViewer()` returns the current viewer instance. May be undefined if the viewer isn't ready yet and waiting on conversion to happen.

`Box.Preview.enableViewers(/* String|Array[String] */ viewers)` enables one or more viewers based on VIEWERNAME.

`Box.Preview.disableViewers(/* String|Array[String] */ viewers)` disables one or more viewers based on VIEWERNAME. Viewers can also be disabled by setting `disabled: true` on the specific viewer option inside options.


Events
-------

The preview object exposes `addListener` and `removeListener` for binding to events. Events should be bound before calling `show()` otherwise they can be missed.

```javascript
Box.Preview.addListener(EVENTNAME, (value) => {
    // do something with value
});

Box.Preview.show(...);
```

EVENTNAME can be one of the following

* `load` event will be fired on every preview load if inter-preview navigation is happening. The value will be an object contaianing
```javascript
  {
      viewer: {...},    // Instance of the current viewer
      metrics: {...},   // Performance metrics
      file: {...}       // Box file object as returned by the API
  }
```
* `navigation` event will be fired when navigation happens. This will give the file id of the file being navigated to. It will fire before a load event.
