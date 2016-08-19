[![Project Status](http://opensource.box.com/badges/active.svg)](http://opensource.box.com/badges)

Box Javascript Preview SDK
===========

The Box Javascript Preview SDK makes it easy for developers to embed previews of Box files in a web application. The SDK fetches information about the file and its converted representations through the Box Content API, chooses the appropriate viewer for the file type, dynamically loads the static assets and file representations needed, and finally renders the preview client-side. The SDK also allows previews of multiple files to be loaded in the same container and exposes arrows to navigate between those files.

Browser Support
===============
* Desktop Chrome, Firefox, Safari, Edge, and Internet Explorer 11
* Limited support for mobile web - previews will render but some controls may not work. Full support will come soon

The browser needs to have the Promise API implimented. If not, it can be polyfilled by including a promise library (e.g. Bluebird - https://cdn.jsdelivr.net/bluebird/3.3.1/bluebird.min.js) before including any other script.

Latest version of the SDK hosted on Box's CDN
============================
* Version: 0.73.0
* Locale: en-US

https://cdn01.boxcdn.net/content-experience/0.73.0/en-US/preview.js  
https://cdn01.boxcdn.net/content-experience/0.73.0/en-US/preview.css

Usage
=====
```html
<!DOCTYPE html>
<html lang="en-US">
<head>
    <meta charset="utf-8" />
    <title>Preview API Sample</title>

    <!-- Polyfill promise API if using Internet Explorer -->
    <script src="//cdn.jsdelivr.net/bluebird/3.3.1/bluebird.min.js"></script>

    <!-- Latest version of Preview SDK for en-US locale -->
    <script src="//cdn01.boxcdn.net/content-experience/0.73.0/en-US/preview.js"></script>
    <link rel="stylesheet" href="//cdn01.boxcdn.net/content-experience/0.73.0/en-US/preview.css" />
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

Setup
=================
*Note: Do not use sudo for the commands below below. If you did, delete the ~/.npm and node_module folders and run npm install again without sudo.*

1. Make sure you have Node version 4 or higher.
2. Fork the upstream repo `https://gitenterprise.inside-box.net/Preview/Preview` under your LDAP account.
3. Then clone your fork `git clone git@gitenterprise.inside-box.net:YOURLDAP/Preview.git`. This will be your origin.
4. `cd Preview`
5. Add the upstream repo via `git remote add upstream https://gitenterprise.inside-box.net/Preview/Preview`.
6. Verify repos via `git remote -v`. You will always pull from `upstream` and push to `origin`.
7. `npm install`
8. `npm run build`

*Note: If you get a rsync error while running the build for the 1st time, it probably failed to copy the built assets to your dev VM. In that case go to your dev VM and manually create the folder `/box/www/assets` and give it 777 permissions via `chmod 777 assets`. This folder acts as your static server for local development.*

**Update webapp conf override (developers only)**

In order for the webapp to use your static assets from your dev VM, you will need to add entries for yourself in `preview.conf` which requires an appconf push to dev. Follow instructions here `https://confluence.inside-box.net/display/ETO/Appconf+User+Guide#AppconfUserGuide-DevWorkflow`. If you are a developer, you would want an entry in there pointing to your dev VM with version set to `dev`. If you are not a developer, then you do not need to modify this file and it will automatically use the version thats deployed to our live CDNs.

While developing
----------------
Install SCSS linter `gem install scss_lint` for linting SCSS files.

Install the following plugins in Sublime

* babel (then set JS files to use babel)
* editorconfig
* sublime linter
* sublime linter contrib eslint
* sublime linter contrib scss

Similar counterparts for atom.

NPM commands
------------

* `npm run build` to generate resource bundles and JS webpack bundles.
* `npm run watch` to only generate JS webpack bundles on file changes.
* `npm run test` launches karma tests with chrome browser to debug tests.
* `npm run coverage` launches karma tests with PhantomJS and dumps coverage inside `reports\coverage`. This requires PhantomJS 2.x, which can be installed via `npm install -g phantomjs`.
* `npm run test-file -- FILENAME` launches test for FILENAME-test.js instead of all tests.

*For more script commands see `package.json`*

Release build
-------------
`npm run release` does a release build.

Change log
----------
Generate using `github_changelog_generator --github-site https://gitenterprise.inside-box.net --github-api https://gitenterprise.inside-box.net/api/v3 --token 0c280723f1ceb4dd83f934f1dc117b9f0a15a2df Preview/Preview`

Demo and testing local changes
==============================
https://gitenterprise.inside-box.net/Preview/demo

API
===

The recommended way to show a preview is by calling `Box.Preview.show(fileId, { options })` where fileId is a `Box_File` id. `Box.Preview` is an instance of the class `Preview`. Another way to show a preview or multiple previews on the same page is by creating instances of the `Preview` class as follows:

```javascript
let preview = new Preview();
preview.show(fileId, { options });
```

{ options }
===========

```javascript
{
    token: 'AUTHTOKEN',
    container: '.preview-container',
    api: 'https://api.box.com',
    sharedLink: 'https://cloud.box.com/v/chicken',
    sharedLinkPassword: 'foo',
    collection: ['123', '234', ...],
    header: 'light',
    logoUrl: 'http://i.imgur.com/xh8j3E2.png',
    showDownload: true,
    viewers: {
        VIEWERNAME: {
            disabled: true,
            annotations: true
            ...
        },
        ...
    }
}
```
| Option | Optionality | Default | Description |
| --- | --- | --- | --- |
| token | Required |  | Either a string auth token or a token generator function, see below for details |
| container | Optional | document.body | DOM node or selector where Preview should be placed |
| api | Optional | https://api.box.com | Root API URL |
| sharedLink | Optional |  | Shared link URL |
| sharedLinkPassword | Optional |  | Shared link password |
| collection | Optional |  | List of file IDs to preview over |
| header | Optional | 'light' | String value of 'none' or 'dark' or 'light' that controls header visibility and theme |
| logoUrl | Optional |  | URL of logo to show in header |
| showDownload | Optional | false | Whether download button is shown |
| viewers | Optional |  | Arguments to pass on to viewers |
| VIEWERNAME |  |  | Name of the viewer, see below for more details |
| disabled |  | false | Disables the viewer |
| annotations |  | false | Enables annotations for the viewer |

Token
=====

The Preview SDK needs an authentication token to make Box Content API calls. The value passed in for the token option above can be either a string token or a token generator function. If a string is passed in, it is assumed that the token never expires or changes. If, however, the token expires or changes over time, then a generator function should be passed in instead. The generator function should take in a file id or a list of file ids as the argument. It should return a `Promise` which should resolve to either a string token (for example when the same token is being used for all files) or a JSON map of { file id: token } pairs. A sample implementation is below:

```javascript
/**
 * Auth token generator function.
 * @param {String|Array} id File id or array of file ids
 * @returns {Promise} Promise to resolve to a map of ids and tokens or just a string token
 */
function tokenGenerator(id) {
    // id can be a single file id or an array of ids
    const ids = Array.isArray(id) ? id : [id];

    return new Promise((resolve, reject) => {
        // Get tokens for all files with ids
        // via some mechanism or network request
        //    response should look like
        //    {
        //        id1: 'token1',
        //        id2: 'token2',
        //        id3: 'token3'
        //        ...
        //    }
        //      -- OR --
        //       'token'
        //
        fetch(tokenServiceUrl, {
            method: 'post',
            body: { fileIDs: ids } // based on what the token service endpoint expects
        })
        .then((response) => response.json())  // OR response.text()
        .then(resolve)
        .catch(reject);
    });
}
```

VIEWERNAME
==========

The name of the viewer. Can be one of the following `Document`, `Presentation`, `MP3`, `MP4`, `Dash`, `Image`, `Text`, `SWF`, `Image360`, `Video360`, `Model3d`, `CSV`, `Markdown`. This list of viewers can also be discovered by calling `Box.Preview.getViewers()`.

Other Methods
=============

`Box.Preview.hide()` hides the preview.

`Box.Preview.updateCollection(/* Array[file ids] */ collection)` updates the collection to navigate through. Assumes the currently visible file is part of this new collection.

`Box.Preview.getCurrentCollection()` returns the current collection if any.

`Box.Preview.getCurrentFile()` returns the current file being previewed if any. The file object structure is the same as returned by the [https://box-content.readme.io/reference#files](Box content API).

`Box.Preview.getCurrentViewer()` returns the current viewer instance. May be undefined if the viewer isn't ready yet and waiting on conversion to happen.

`Box.Preview.enableViewers(/* String|Array[String] */ viewers)` enables one or more viewers based on VIEWERNAME.

`Box.Preview.disableViewers(/* String|Array[String] */ viewers)` disables one or more viewers based on VIEWERNAME. Viewers can also be disabled by setting `disabled: true` on the specific viewer option inside options.

`Box.Preview.print()` prints the file if printable.

`Box.Preview.download()` downloads the file if downloadable.

`Box.Preview.resize()` resizes the current preview if applicable. This function only needs to be called when preview's viewport has changed while the window object has not. If the window is resizing, then preview will automatically resize itself.

`Box.Preview.getViewers()` lists all the available viewers.

`Box.Preview.prefetchViewers()` prefetches the static assets for all the available viewers for browser to cache for performance.

Events
======

The preview object exposes `addListener` and `removeListener` for binding to events. Events should be bound before calling `show()` otherwise they can be missed.

```javascript
const listener = (value) => {
    // do something with value
};

// Attach listeners before calling show otherwise events can be missed
Box.Preview.addListener(EVENTNAME, listener);

// Show a preview
Box.Preview.show(...);

// Remove listeners when needed or before hiding the preview
Box.Preview.removeListener(EVENTNAME, listener);
```

EVENTNAME can be one of the following

* `viewer` event will be fired when we have the viewer instance 1st available. This will be the same object that is part of the `load` event also. This event will be fired before `load` so that clients can attach their listeners before the `load` event fires.

* `load` event will be fired on every preview load when `show()` is called or if inter-preview navigation is happening. The value argument will be an object containing:
```javascript
  {
      error: 'message', // Error message if any that happened while loading the preview
      viewer: {...},    // Instance of the current viewer object, only if no error message. Same value as the `viewer` event.
      metrics: {...},   // Performance metrics
      file: {...}       // Box file object as returned by the [https://box-content.readme.io/reference#files](Box content API)
  }
```
* `navigate` event will be fired when navigation happens. This will give the file id of the file being navigated to. It will fire before a load event happens.

* `notification` event will be fired when either the preview wrapper or one of the viewers wants to notify something like a warning or non-fatal error:
```javascript
  {
      message: 'message', // Message to show
      type: 'warning'    // 'warning' or 'notice' or 'error'
  }
```

* Each viewer will fire its own sets of events. For example, Image viewer will fire `rotate` or `resize` etc. Another viewer may fire similar or other events. All these will be propogated on the viewer instance as shown in the examples below and even on the preview wrapper with the following data:
```javascript
  {
      event: EVENTNAME,         // Some event
      data: DATA,               // Some data
      viewerName: VIEWERNAME,   // Name of the viewer. See VIEWERNAME above
      fileId: fileId            // The file id
  }
```

Examples
--------

```javascript
Box.Preview.addListener('viewer', (viewer) => {
    viewer.addListener('rotate', () => {
        // do something
    });
});

OR

Box.Preview.addListener('load', (data) => {
    const viewer = data.viewer;
    viewer.addListener('rotate', () => {
        // do something
    });
});

OR

Box.Preview.addListener('rotate', (data) => {
    if (data.viewerName === 'Image') {
        // Do something when image rotation happens
    } else if (data.viewerName === 'Image360') {
        // Do something else when 360 image rotation happens
    } else if (...) { ... }
});

```
