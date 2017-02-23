![Project Status](https://img.shields.io/badge/status-active-brightgreen.svg)
![NPM version](https://img.shields.io/badge/npm-v0.101.0-blue.svg)

[Box Javascript Preview SDK](https://docs.box.com/docs/box-javascript-preview-sdk)
===============

The Box Javascript Preview SDK makes it easy for developers to embed previews of Box files in a web application. The SDK fetches information about the file and its converted representations through the Box Content API, chooses the appropriate viewer for the file type, dynamically loads the static assets and file representations needed, and finally renders the preview client-side. The SDK also allows previews of multiple files to be loaded in the same container and exposes arrows to navigate between those files.

Browser Support
---------------
* Desktop Chrome, Firefox, Safari, Edge, and Internet Explorer 11
* Limited support for mobile web - previews will render but some controls may not work

Preview uses the Promise object. If your browser doesn't support Promises, they can be polyfilled by including a promise library (e.g. Bluebird - https://cdn.jsdelivr.net/bluebird/latest/bluebird.min.js) before including any other script.

Current Version
---------------
* Version: 0.101.0
* Locale: en-US

https://cdn01.boxcdn.net/platform/preview/0.101.0/en-US/preview.js
https://cdn01.boxcdn.net/platform/preview/0.101.0/en-US/preview.css

Usage
-----
```html
<!DOCTYPE html>
<html lang="en-US">
<head>
    <meta charset="utf-8" />
    <title>Preview SDK Demo</title>

    <!-- Polyfill promise API if using Internet Explorer 11 -->
    <script src="https://cdn.jsdelivr.net/bluebird/latest/bluebird.min.js"></script>

    <!-- Latest version of Preview SDK for your locale -->
    <script src="https://cdn01.boxcdn.net/platform/preview/0.101.0/en-US/preview.css"></script>
    <link rel="stylesheet" href="https://cdn01.boxcdn.net/platform/preview/0.101.0/en-US/preview.js" />
</head>
<body>
    <div class="preview-container" style="height:400px;width:575px"></div>
    <script>
        Box.Preview.show('93392244621', 'EqFyi1Yq1tD9mxY8F38sxDfp73pFd7FP', {
    	    container: '.preview-container'
        });
    </script>
</body>
</html>
```

Preview Demo
---------------
View demo and sample code on CodePen - http://codepen.io/box-platform/pen/KaQbma.


Setup
-----
*Note: Do not use sudo for the commands below below. If you did, delete the ~/.npm and node_module folders and run npm install again without sudo.*

1. Make sure you have Node version 4.x.
2. Fork the upstream repo `https://git.dev.box.net/Preview/Preview` under your LDAP account.
3. Then clone your fork `git clone git@git.dev.box.net:YOURLDAP/Preview.git`. This will be your origin.
4. `cd Preview`
5. Add the upstream repo via `git remote add upstream git@git.dev.box.net/Preview/Preview.git`.
6. Verify repos via `git remote -v`. You will always pull from `upstream` and push to `origin`.
7. `npm install`
8. `npm run build`

*Note: If you get a rsync error while running the build for the 1st time, it probably failed to copy the built assets to your dev VM. In that case go to your dev VM and manually create the folder `/box/www/assets` and give it 777 permissions via `chmod 777 assets`. This folder acts as your static server for local development.*

**Update webapp conf override (developers only)**

In order for the webapp to use your static assets from your dev VM, you will need to add entries for yourself in `preview.conf` which requires an appconf push to dev. You will need to edit the following sections of the file

* under "path": `path<username> = content-experience`
* under "hosts": `hostname<username> = username.dev.box.net`
* under "files_app": `version<username> = dev`
* under "expiring_embed": `version<username> = dev`

 Follow instructions here `https://confluence.inside-box.net/display/ETO/Appconf+User+Guide#AppconfUserGuide-DevWorkflow`. If you are a developer, you would want an entry in there pointing to your dev VM with version set to `dev`. If you are not a developer, then you do not need to modify this file and it will automatically use the version thats deployed to our live CDNs.

While Developing
----------------
Install the following plugins in your preferred editor

* babel (then set JS files to use babel)
* editorconfig
* sublime linter
* sublime linter contrib eslint
* sublime linter contrib scss

### NPM commands

* `npm run build` to generate resource bundles and JS webpack bundles.
* `npm run watch` to only generate JS webpack bundles on file changes.
* `npm run test` launches karma tests with PhantomJS.
* `npm run test -- --src=path/to/src/FILENAME` launches test only for `src/lib/path/to/src/__tests__/FILENAME-test.js` instead of all tests.
* `npm run debug` launches karma tests with PhantomJS for debugging. Open the URL mentioned in the console.
* `npm run debug -- --src=path/to/src/FILENAME` launches debugging for `src/lib/path/to/src/__tests__/FILENAME-test.js` instead of all tests. Open the URL mentioned in the console.

*For more script commands see `package.json`*
*Coverage reports are available under reports/coverage*

### Config files

* .babelrc - https://babeljs.io/docs/usage/babelrc/
* .editorconfig - http://editorconfig.org/
* .eslintignore - http://eslint.org/docs/user-guide/configuring#ignoring-files-and-directories
* .eslintrc - http://eslint.org/docs/user-guide/configuring
* .gitignore - https://git-scm.com/docs/gitignore
* .stylelintrc - https://stylelint.io/user-guide/configuration/
* browserslist - https://github.com/ai/browserslist
* postcss.config.js - https://github.com/postcss/postcss-loader

### Release build
`npm run release` does a release build.

Initialization
--------------

The recommended way to show a preview is by calling `Box.Preview.show(fileID, accessToken, { options })` where `fileID` is a `Box_File` id and `accessToken` is a Box API access token. `Box.Preview` is an instance of the class `Preview`. Another way to show a preview or multiple previews on the same page is by creating instances of the `Preview` class as follows:

```javascript
const preview = new Preview();
preview.show(fileID, accessToken, { options });
```

Parameters & Options
-------

```javascript
Box.Preview.show(fileID, accessToken, {
    container: '.preview-container',
    api: 'https://api.box.com',
    sharedLink: 'https://app.box.com/v/foo',
    sharedLinkPassword: 'bar',
    collection: [FILE_ID, '123', '234', ...],
    header: 'light',
    logoUrl: 'http://i.imgur.com/xh8j3E2.png',
    showAnnotations: true,
    showDownload: true,
    viewers: {
        VIEWERNAME: {
            disabled: true,
            annotations: true
            ...
        },
        ...
    }
});
```
| Parameter | Description |
| --- | --- |
| fileID | Box file ID |
| accessToken | Either a string auth token or a token generator function, see below for details |

| Option | Default | Description |
| --- | --- | --- |
| container | document.body | DOM node or selector where Preview should be placed |
| api | https://api.box.com | Root API URL |
| sharedLink |  | Shared link URL |
| sharedLinkPassword |  | Shared link password |
| collection |  | List of file IDs to iterate over for previewing |
| header | 'light' | String value of 'none' or 'dark' or 'light' that controls header visibility and theme |
| logoUrl |  | URL of logo to show in header |
| showAnnotations | false | Whether annotations and annotation controls are shown. This option will be overridden by viewer-specific annotation options if they are set. |
| showDownload | false | Whether download button is shown |
| useHotkeys | true | Whether hotkeys (keyboard shortcuts) are enabled |
| viewers |  | Arguments to pass on to viewers |
| { VIEWERNAME } |  | Name of the viewer, see below for more details |
| {{ disabled }} | false | Disables the viewer |
| {{ annotations }} | false | Enables annotations for the viewer |

Authentication Token
--------------------

The Preview SDK needs an authentication token to make Box Content API calls. The value passed in for the token option above can be either a string token or a token generator function. If a string is passed in, it is assumed that the token never expires or changes. If, however, the token expires or changes over time, then a generator function should be passed in instead. The generator function should take in a file id or a list of file ids as the argument. It should return a `Promise` which should resolve to either a string token (for example when the same token is being used for all files) or a JSON map of { file id: token } pairs. A sample implementation is below:

```javascript
/**
 * Auth token generator function.
 * @param {string|Array} id - File id or array of file ids
 * @return {Promise} Promise to resolve to a map of ids and tokens or just a string token
 */
function tokenGenerator(id) {
    // id can be a single file id or an array of ids, normalizing to an array
    const ids = Array.isArray(id) ? id : [id];

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
    // The fetch() API returns a promise
    return fetch(tokenServiceUrl, {
        method: 'post',
        body: { fileIDs: ids } // based on what the token service endpoint expects
    })
    .then((response) => response.json());  // OR response.text()
}
```

Viewers
-------

The name of a viewer can be one of the following `Document`, `Presentation`, `MP3`, `MP4`, `Dash`, `Image`, `Text`, `SWF`, `Image360`, `Video360`, `Model3d`, `CSV`, `Markdown`. This list of possible viewers can also be discovered by calling `Box.Preview.getViewers()`.

Additional Methods
------------------

`Box.Preview.hide()` hides the preview.

`Box.Preview.updateCollection(/* Array[file ids] */ collection)` updates the collection to navigate through. Assumes the currently visible file is part of this new collection.

`Box.Preview.getCurrentCollection()` returns the current collection if any.

`Box.Preview.getCurrentFile()` returns the current file being previewed if any. The file object structure is the same as returned by the [https://box-content.readme.io/reference#files](Box content API).

`Box.Preview.getCurrentViewer()` returns the current viewer instance. May be undefined if the viewer isn't ready yet and waiting on conversion to happen.

`Box.Preview.enableViewers(/* String|Array[String] */ viewers)` enables one or more viewers based on VIEWERNAME.

`Box.Preview.disableViewers(/* String|Array[String] */ viewers)` disables one or more viewers based on VIEWERNAME. Viewers can also be disabled by setting `disabled: true` on the specific viewer option inside options.

`Box.Preview.enableHotkeys()` enables hotkeys (keyboard shortcuts).

`Box.Preview.disableHotkeys()` disables hotkeys (keyboard shortcuts).

`Box.Preview.print()` prints the file if printable.

`Box.Preview.download()` downloads the file if downloadable.

`Box.Preview.resize()` resizes the current preview if applicable. This function only needs to be called when preview's viewport has changed while the window object has not. If the window is resizing, then preview will automatically resize itself.

`Box.Preview.getViewers()` lists all the available viewers.

`Box.Preview.prefetchViewers()` prefetches the static assets for all the available viewers for browser to cache for performance.

Events
------

The preview object exposes `on` and `off` for binding to events. Event listeners should be bound before the call to `show()`, otherwise events can be missed.

```javascript
const listener = (value) => {
    // Do something with value
};

// Attach listener before calling show otherwise events can be missed
Box.Preview.on(EVENTNAME, listener);

// Show a preview
Box.Preview.show(...);

// Remove listener when needed
Box.Preview.off(EVENTNAME, listener);
```

EVENTNAME can be one of the following

* `viewer` event will be fired when we have the viewer instance first available. This will be the same object that is also a property included in the `load` event. Preview fires this event before `load` so that clients can attach their listeners before the `load` event is fired.

* `load` event will be fired on every preview load when `show()` is called or if inter-preview navigation occurs. The event data will contain:
```javascript
  {
      error: 'message', // Error message if any error occurred while loading
      viewer: {...},    // Instance of the current viewer object if no error occurred
      metrics: {...},   // Performance metrics
      file: {...}       // Box file object with properties defined in file.js
  }
```
* `navigate` event will be fired when navigation happens. The event includes the file ID of the file being navigated to, and this event will fire before `load`.

* `notification` event will be fired when either the preview wrapper or one of the viewers wants to notify something like a warning or non-fatal error. The event data will contain:
```javascript
  {
      message: 'message', // Message to show
      type: 'warning'    // 'warning', 'notice', or 'error'
  }
```

* `viewerevent` Each viewer will fire its own sets of events. For example, the Image viewer will fire `rotate` or `resize`, etc. while other viewers may fire another set of events. The preview wrapper will also re-emit events at the preview level, with event data containing:
```javascript
  {
      event: EVENTNAME,         // Event name
      data: DATA,               // Event data object
      viewerName: VIEWERNAME,   // Name of the viewer. See VIEWERNAME above
      fileID: fileID            // The file id
  }
```

### Example event usage

```javascript
Box.Preview.on('viewer', (viewer) => {
    viewer.on('rotate', () => {
        // Do something when a viewer rotates a preview
    });
});

Box.Preview.on('load', (data) => {
    const viewer = data.viewer;
    viewer.on('rotate', () => {
        // Do something when a viewer rotates a preview
    });
});

Box.Preview.on('viewerevent', (data) => {
    if (data.viewerName === 'Image') {
        if (data.event === 'rotate') {
            // Do something when an image preview is rotated
        }
    } else if (data.viewerName === 'Image360') {
        if (data.event === 'rotate') {
            // Do something different when a 360-degree image is rotated
        }
    } else {}
});

Box.Preview.on('rotate', (data) => {
    if (data.viewerName === 'Image') {
        // Do something when an image preview is rotated
    } else if (data.viewerName === 'Image360') {
        // Do something different when a 360-degree image is rotated
    } else {}
});

```

Support
-------

Need to contact us directly? Email oss@box.com and be sure to include the name of this project in the subject.

Copyright and License
---------------------

Copyright 2017 Box, Inc. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
