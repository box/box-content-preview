[![Project Status](https://img.shields.io/badge/status-active-brightgreen.svg?style=flat-square)](http://opensource.box.com/badges/)
[![Mergify Status](https://img.shields.io/endpoint.svg?url=https://gh.mergify.io/badges/box/box-content-preview&style=flat)](https://mergify.io)
[![Styled With Prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![build status](https://img.shields.io/travis/box/box-content-preview/master.svg?style=flat-square)](https://travis-ci.org/box/box-content-preview)
[![version](https://img.shields.io/badge/version-v3.9.0-blue.svg?style=flat-square)](https://github.com/box/box-content-preview)
[![npm version](https://img.shields.io/npm/v/box-ui-elements.svg?style=flat-square)](https://www.npmjs.com/package/box-ui-elements)

# [Box Content Preview](https://developer.box.com/docs/box-content-preview)

The Box Content Preview library allows developers to easily embed high quality and interactive previews of Box files in desktop and mobile web applications. The JavaScript library fetches information about the file and its converted representations through the Box API, chooses the appropriate viewer for the file type, dynamically loads the necessary static assets and file representations, and finally renders the file. Box Content Preview also allows previews of multiple files to be loaded in the same container and exposes arrows to navigate between those files.

This library powers Preview in the main Box web application as well as the 'Get Embed Link' Box API endpoint.

## Browser Support

- Desktop Chrome, Firefox, Safari, Edge
- Limited support for mobile web - previews will render but some controls may not work

Effective September 1, 2023, Box is discontinuing support for Internet Explorer 11 (IE 11) in Preview SDK. If your application requires IE 11 support, we recommend using the release versions of Preview SDK that were made available before August 15th, 2023. Our team will address any critical blocker and security issues specifically related to IE 11 until October 15, 2023. Following this date, we will no longer provide active support for IE 11 in Preview SDK.

We encourage all users to update their applications to utilize modern browsers for optimal performance, security, and compatibility with the latest features in Preview SDK.

## Current Version

- Version: v3.9.0
- Locale: en-US

https://cdn01.boxcdn.net/platform/preview/3.9.0/en-US/preview.js
https://cdn01.boxcdn.net/platform/preview/3.9.0/en-US/preview.css

## Supported Locales

To use a different locale, replace `en-US` in the URLs above with any of the following supported locales.

`en-AU`, `en-CA`, `en-GB`, `en-US`, `bn-IN`, `da-DK`, `de-DE`, `es-419`, `es-ES`, `fi-FI`, `fr-CA`, `fr-FR`, `hi-IN`,`it-IT`, `ja-JP`, `ko-KR`, `nb-NO`, `nl-NL`, `pl-PL`, `pt-BR`, `ru-RU`, `sv-SE`, `tr-TR`, `zh-CN`, `zh-TW`

## Supported File Types

Box Content Preview supports 100+ file types, including most document and image formats, HD video, 3D models, 360-degress images, and 360-degree videos. You can find the full list of supported file types on [Box Support](https://support.box.com/hc/en-us/articles/360043695794-Viewing-Different-File-Types-Supported-in-Box-Content-Preview) .

## Usage

### Including Preview as a library

You can self-host the Box Content Preview library or reference the versions available on Box's CDN.

```html
<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta charset="utf-8" />
    <title>Box Content Preview Demo</title>

    <!-- Latest version of Preview SDK for your locale -->
    <script src="https://cdn01.boxcdn.net/platform/preview/3.9.0/en-US/preview.js"></script>
    <link
      rel="stylesheet"
      href="https://cdn01.boxcdn.net/platform/preview/3.9.0/en-US/preview.css"
    />
  </head>
  <body>
    <div class="preview-container" style="height:400px;width:575px"></div>
    <script>
      var preview = new Box.Preview();
      preview.show('93392244621', 'EqFyi1Yq1tD9mxY8F38sxDfp73pFd7FP', {
        container: '.preview-container',
      });
    </script>
  </body>
</html>
```

### Self-hosting

To self-host the Box Content Preview library, follow these steps:

1. Either fork the repo and check out the version you want to host or download the specific version as a zip:

- Check out a specific version with `git checkout v3.9.0`
- Download a specific version as a zip from https://github.com/box/box-content-preview/releases

2. Install dependencies and build the library with `yarn install && yarn build:i18n && yarn build:prod`
3. Self-host everything except for the `dev` folder from the `/dist` folder. You must not alter the folder structure and `third-party` needs to be in the same folder as `2.4.0`. For example, if you self-host using a `box-assets` directory, these URLs must be accessible:

- https://cdn.YOUR_SITE.com/box-assets/2.4.0/en-US/preview.js
- https://cdn.YOUR_SITE.com/box-assets/third-party/text/0.114.0/papaparse.min.js
- https://cdn.YOUR_SITE.com/box-assets/third-party/model3d/1.12.0/three.min.js

### Importing Preview as a React Component

Preview can also be used as a React Component with the Box Element framework. The source code for the Content Preview Element wrapper is located at https://github.com/box/box-ui-elements/tree/master/src/components/ContentPreview. Please reference https://github.com/box/box-content-preview-demo for a minimal React application using this wrapper.

## CORS (Cross-Origin Resource Sharing)

For security purposes, you must whitelist your application's HTTP origin, omitting any trailing slash, in the configuration section of the Developer Console. For example, CodePen's domain is whitelisted for the demo application below.

![Screenshot of CORS whitelist](images/cors.png)

## Demo

View a demo and sample code on CodePen - http://codepen.io/box-platform/pen/rmZdjm.

## Initialization

```javascript
var preview = new Box.Preview();
preview.show(fileId, accessToken, { options });
```

Where `fileId` is a string `Box_File` id and `accessToken` is a Box API access token.

## Parameters & Options

```javascript
var preview = new Box.Preview();
preview.show(fileId, accessToken, {
    container: '.preview-container',
    sharedLink: 'https://app.box.com/v/foo',
    sharedLinkPassword: 'bar',
    collection: [FILE_ID, '123', '234', ...],
    header: 'light',
    logoUrl: 'http://i.imgur.com/xh8j3E2.png',
    showAnnotations: true,
    showDownload: true
});
```

| Parameter   | Description                                                                     |
| ----------- | ------------------------------------------------------------------------------- |
| fileId      | Box file ID                                                                     |
| accessToken | Either a string auth token or a token generator function, see below for details |

| Option                                                                | Default       | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| container                                                             | document.body | DOM node or selector where Preview should be placed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| sharedLink                                                            |               | Shared link URL                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| sharedLinkPassword                                                    |               | Shared link password                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| collection                                                            |               | List of file IDs to iterate over for previewing                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| header                                                                | `light`       | String value of `none` or `dark` or `light` that controls header visibility and theme                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| logoUrl                                                               |               | URL of logo to show in header                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| showAnnotations                                                       | false         | Whether annotations and annotation controls are shown. This option will be overridden by viewer-specific annotation options if they are set. See [Box Annotations](https://github.com/box/box-annotations) for more details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| showDownload                                                          | false         | Whether download button is shown                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| autoFocus                                                             | true          | Whether preview should focus itself when a file loads                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| useHotkeys                                                            | true          | Whether hotkeys (keyboard shortcuts) are enabled                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| fixDependencies                                                       | false         | Temporarily patches AMD to properly load Preview's dependencies. You may need to enable this if your project uses RequireJS                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| disableEventLog                                                       | false         | Disables client-side `preview` event log. Previewing with this option enabled will not increment access stats (content access is still logged server-side)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| fileOptions                                                           | {}            | Mapping of file ID to file-level options. See the File Option table below for details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| previewWMPref                                                         | `any`         | String value of `all`, `any`, or `none` that sets how previews of watermarked files behave. See https://community.box.com/t5/Sharing-Content-with-Box/Watermarking-Files/ta-p/30766 for more information about watermarking and https://community.box.com/t5/Collaborate-By-Inviting-Others/Understanding-Collaborator-Permission-Levels/ta-p/144 for more information about permissions and collaboration roles.<br><br>`all` forces watermarked previews. If the file type supports watermarking, users with `can_preview` permissions will see a watermarked preview. If the file type cannot be watermarked, no preview is shown.<br><br>`any` is the default watermarking behavior in the Box Web Application. If the file type supports watermarking, users with `can_preview` permissions will see a watermarked preview. If the file type cannot be watermarked, users that have both `can_preview` and `can_upload` permissions will see a non-watermarked preview and no preview otherwise.<br><br>`none` forces non-watermarked previews. Users that have both `can_preview` and `can_upload` permissions will see a non-watermarked preview and no preview otherwise. |
| downloadWM                                                            | false         | Whether the download of a watermarked file should be watermarked. This option does not affect non-watermarked files. If true, users will be able to download watermarked versions of supported file types as long as they have `can_preview` permissions (any collaboration role except for `Uploader`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| viewers                                                               | {}            | Maps options to a valid viewer type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| viewers.Document.disableFontFace viewers.Presentation.disableFontFace | false         | By default, fonts are converted to OpenType fonts and loaded via font face rules. If disabled, fonts will be rendered using a built-in font renderer that constructs the glyphs with primitive path commands. **Use this option at your own risk**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| responseInterceptor                                                   |               | Function to intercept responses. For an example see https://codepen.io/box-platform/pen/jLdxEv                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| requestInterceptor                                                    |               | Function to intercept requests. For an example see https://codepen.io/box-platform/pen/jLdxEv                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

| File Option   | Default   | Description                                                                                                                                                                                    |
| ------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fileVersionId | (Current) | File version ID to preview. This must be a valid non-current file version ID. Use [Get Versions](https://developer.box.com/reference#view-versions-of-a-file) to fetch a list of file versions |
| startAt       | {}        | Options for starting location. See the Start At table below for details                                                                                                                        |

| Start At | Description                                                  |
| -------- | ------------------------------------------------------------ |
| unit     | Supported values: "pages" for documents; "seconds" for media |
| value    | Integer value specifying the start location                  |

**Example**

This configuration will attempt to Preview a non-current version of the given file (a document, in this case) at a specific starting page:

```javascript
var FILE_ID = '12345';
var TOKEN = 'abcdefg';
preview.show(FILE_ID, TOKEN, {
  fileOptions: {
    [FILE_ID]: {
      fileVersionId: '54321',
      startAt: {
        unit: 'pages',
        value: 2,
      },
    },
  },
});
```

## Access Token

Box Content Preview needs an access token to make Box API calls. You can either get an access token from the token endpoint (https://developer.box.com/reference#token) or generate a developer token on your application management page (https://blog.box.com/blog/introducing-developer-tokens/).

If your application requires the end user to only be able to access a subset of the Content Preview functionality, you can use [Token Exchange](https://developer.box.com/reference#token-exchange) to appropriately downscope your App/Managed or Service Account token to a resulting token that has the desired set of permissions, and can thus, be securely passed to the end user client initializing the Content Preview.

Below are a set of new Box Element-specific scopes to go alongside Token Exchange. These allow developers to enable/disable UI controls on the Content Preview by configuring the appropriate scopes on the downscoped token. To learn more, see [Special Scopes for Box Elements](https://developer.box.com/docs/special-scopes-for-box-ui-elements).

Wish to learn more about when, why and how you can use Token Exchange with the Content Preview? See our [blueprint on Customizing Access for the Box Elements](https://developer.box.com/docs/customizing-access-for-ui-elements).

### Base Scope

| Scope Name   | What permissions does it grant?                                                           |
| ------------ | ----------------------------------------------------------------------------------------- |
| base_preview | Allows preview access to a file or files in a folder based on user/file/token permissions |

### Feature Scopes

| Scope Name           | What permissions does it grant?                                           |
| -------------------- | ------------------------------------------------------------------------- |
| item_download        | Allows files/folders contents to be downloaded                            |
| annotation_view_self | Allows user to view their own annotations                                 |
| annotation_view_all  | Allows user to view all annotations on the file                           |
| annotation_edit      | Allows user to edit their own annotations (includes annotation_view_self) |

### Sample Scenarios

| Scenario                                                                                                   | Scope Combinations                                   |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| User wants basic preview functionality + download                                                          | base_preview + item_download                         |
| User wants basic preview functionality + ability to edit own annotations                                   | base_preview + annotation_edit                       |
| User wants basic preview functionality + ability to view all annotations + ability to edit own annotations | base_preview + annotation_view_all + annotation_edit |

## Token Generator Function

The Preview library optionally takes a token generator function instead of a string token. Using a token generator function allows you to dynamically determine what tokens Preview should use. For example, you can pass in different access tokens for each file or make sure your token is refreshed and valid before showing a preview. The token generator function should return a promise that resolves in either a single string token that applies to all of the files being previewed or a map of typed file IDs to access token for those files.

```javascript
// Example token generator function that resolves to a single access token
var singleTokenGenerator = function() {
  return someApi.getToken().then(function(data) {
    return data.token;
  });
};

// Example token generator function that resolves to a map of tokens
var mapTokenGenerator = function() {
  return Promise.resolve({
    file_1234: 'some_token_abcd',
    file_2345: 'some_token_bcde',
  });
};
```

## Viewers

The name of a viewer can be one of the following `Document`, `Presentation`, `MP3`, `MP4`, `Dash`, `Image`, `Text`, `SWF`, `Image360`, `Video360`, `Model3d`, `CSV`, `Markdown`. Call `preview.getViewers()` to get the list of possible viewers.

## Additional Methods

`preview.hide()` hides the preview.

`preview.updateCollection(/* Array[file ids] */ collection)` updates the collection to navigate through. Assumes the currently visible file is part of this new collection.

`preview.getCurrentCollection()` returns the current collection if any.

`preview.navigateLeft()` shows previous file in the collection.

`preview.navigateRight()` shows next file in the collection.

`preview.navigateToIndex(index)` shows the specified index in the current collection.

`preview.getCurrentFile()` returns the current file being previewed if any. The file object structure is the same as returned by the [Box API](https://developer.box.com/reference#files).

`preview.getCurrentViewer()` returns the current viewer instance. May be undefined if the viewer isn't ready yet and waiting on conversion to happen.

`preview.enableViewers(/* String|Array[String] */ viewers)` enables one or more viewers based on VIEWERNAME.

`preview.disableViewers(/* String|Array[String] */ viewers)` disables one or more viewers based on VIEWERNAME. Viewers can also be disabled by setting `disabled: true` on the specific viewer option inside options.

`preview.enableHotkeys()` enables hotkeys (keyboard shortcuts).

`preview.disableHotkeys()` disables hotkeys (keyboard shortcuts).

`preview.print()` prints the file if printable.

`preview.download()` downloads the file if downloadable.

`preview.resize()` resizes the current preview if applicable. This function only needs to be called when preview's viewport has changed while the window object has not. If the window is resizing, then preview will automatically resize itself.

`preview.getViewers()` lists all the available viewers.

`preview.prefetchViewers(/* Array[String] */)` prefetches static assets for the specified viewers that the browser can cache for performance benefits.

## Events

The preview object exposes `addListener` and `removeListener` for binding to events. Event listeners should be bound before `show()` is called, otherwise events can be missed.

```javascript
var preview = new Box.Preview();
var listener = (value) => {
    // Do something with value
};

// Attach listener before calling show otherwise events can be missed
preview.addListener(EVENTNAME, listener);

// Show a preview
preview.show(...);

// Remove listener when appropriate
preview.removeListener(EVENTNAME, listener);
```

EVENTNAME can be one of the following

- `viewer` event will be fired when we have the viewer instance first available. This will be the same object that is also a property included in the `load` event. Preview fires this event before `load` so that clients can attach their listeners before the `load` event is fired.

- `load` event will be fired on every preview load when `show()` is called or if inter-preview navigation occurs. The event data will contain:

```javascript
  {
      error: 'message', // Error message if any error occurred while loading
      viewer: {...},    // Instance of the current viewer object if no error occurred
      metrics: {...},   // Performance metrics
      file: {...}       // Box file object with properties defined in file.js
  }
```

- `navigate` event will be fired when navigation happens. The event includes the file ID of the file being navigated to, and this event will fire before `load`.

- `notification` event will be fired when either the preview wrapper or one of the viewers wants to notify something like a warning or non-fatal error. The event data will contain:

```javascript
  {
      message: 'message', // Message to show
      type: 'warning'    // 'warning', 'notice', or 'error'
  }
```

- `viewerevent` Each viewer will fire its own sets of events. For example, the Image viewer will fire `rotate` or `resize`, etc. while other viewers may fire another set of events. The preview wrapper will also re-emit events at the preview level, with event data containing:

```javascript
  {
      event: EVENTNAME,         // Event name
      data: DATA,               // Event data object
      viewerName: VIEWERNAME,   // Name of the viewer. See VIEWERNAME above
      fileId: fileId            // The file id
  }
```

### Example event usage

```javascript
preview.addListener('viewer', viewer => {
  viewer.addListener('rotate', () => {
    // Do something when a viewer rotates a preview
  });
});

preview.addListener('load', data => {
  var viewer = data.viewer;
  viewer.addListener('rotate', () => {
    // Do something when a viewer rotates a preview
  });
});

preview.addListener('viewerevent', data => {
  if (data.viewerName === 'Image') {
    if (data.event === 'rotate') {
      // Do something when an image preview is rotated
    }
  } else if (data.viewerName === 'Image360') {
    if (data.event === 'rotate') {
      // Do something different when a 360-degree image is rotated
    }
  } else {
  }
});

preview.addListener('rotate', data => {
  if (data.viewerName === 'Image') {
    // Do something when an image preview is rotated
  } else if (data.viewerName === 'Image360') {
    // Do something different when a 360-degree image is rotated
  } else {
  }
});
```

## Development Setup

1. Install latest LTS version of Node `https://nodejs.org/en/download`.
2. Install yarn package manager `https://yarnpkg.com/en/docs/install`. Alternatively, you can replace any `yarn` command with `npm`.
3. Fork the upstream repo `https://github.com/box/box-content-preview`.
4. Clone your fork locally `git clone git@github.com:[YOUR GITHUB USERNAME]/box-content-preview.git`.
5. Navigate to the cloned folder `cd box-content-preview`
6. Add the upstream repo to your remotes `git remote add upstream git@github.com:box/box-content-preview.git`.
7. Verify your remotes are properly set up `git remote -v`. You should pull updates from the Box repo `upstream` and push changes to your fork `origin`.
8. Install dependencies `yarn install`
9. Test your first build! `yarn build`
10. To automatically rsync files after a Webpack build, add a build/rsync.json file with a `location` field. This file should look like:

```
{
    "location": "YOUR_DESIRED_RSYNC_LOCATION_HERE"
}
```

## While Developing

Install the following plugins in your preferred editor

- Editor Config (standardizes basic editor configuration)
- ESLint (Javascript linting)
- Prettier & Prettier - ESLint (Automatic Javascript formatting following ESLint config)
- Stylelint (CSS linting)

### Yarn commands

- `yarn build` to generate resource bundles and JS webpack bundles.
- `yarn start` to only generate JS webpack bundles on file changes.
- `yarn start:dev` to launch a webpack-dev-server instance for local development.
- `yarn test` to run all unit tests with Jest.
- `yarn test path/to/filename.js` to run Jest only for that file and/or its related tests.
- `yarn test:watch` to run all unit tests with Jest for debugging.
- `yarn test:watch path/to/src/filename.js` to run Jest only for that file and/or its related tests for debugging.

For more script commands see `package.json`. Test coverage reports are available under reports/coverage.

## Support

If you have any questions, please search our [issues list](https://github.com/box/box-content-preview/issues) to see if they have been previously answered. Report new issues [here](https://github.com/box/box-content-preview/issues/new).

For general Box Platform, API, and Box Element questions, please visit our [developer forum](https://community.box.com/t5/Developer-Forum/bd-p/DeveloperForum) or contact us via one of our [available support channels](https://community.box.com/t5/Community/ct-p/English).

## Copyright and License

Copyright 2016-present Box, Inc. All Rights Reserved.

Licensed under the Box Software License Agreement v.20170516.
You may not use this file except in compliance with the License.
You may obtain a copy of the License at

https://developer.box.com/docs/box-sdk-license

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
