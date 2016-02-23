Box.Preview
============
Overview
-----------------
The Box Client-Side Preview SDK allows developers to embed a Preview of their Box file(s) in an application. The SDK fetches representations through the Box Content API, chooses the appropriate viewer for the file type, and renders a preview of the file. The SDK currently supports most types of documents, images, videos, audio files, and 3D files.


Latest CDN version
-----------------
https://cdn01.boxcdn.net/content-experience/0.44.0/en-US/preview.js


Clone and compile
-----------------
1. `git clone git@gitenterprise.inside-box.net:Preview/Preview.git`
2. `cd Preview`
3. `npm install --registry https://registry.nodejitsu.com` (The explicit registry is a workaround, will be fixed soon)
4. `npm run build` (does a clean build)

Note: If you get a rsync error while running the build for the 1st time, it probably failed to copy the built assets to your dev VM. In that case go to your dev VM and manually create the folder `/box/www/assets/content-experience` and give it 777 permissions. This folder acts as your static server for local development.


While developing
----------------
1. `npm run mojito-rb-gen` to generate resource bundles (only if needed, `npm run watch` will re-generate resource bundles automatically)
2. `npm run dev` (or `npm run watch`) to generate webpack bundles


Release build
--------------
`npm run release`


Demo and testing local changes
------------------------------
https://gitenterprise.inside-box.net/Preview/demo


API
---

To show a preview call
```javascript
Box.Preview.show(file, { options });
```
Clients are still responsible for showing the container in which preview shows up, if it was hidden. `Box.Preview` is a singleton instance of the `Preview` class. Another way to show a preview or multiple previews is

```javascript
let preview = new Preview();
preview.show(file, { options });
```

* `file` is either a string file id OR JSON file object response from https://box-content.readme.io/reference#files
* `options` is an object with the following attribute

```javascript
{
    token: 'api auth token',
    container: '.preview-container', // optional dom node or selector where preview should be placed
    api: 'https://api.box.com',      // optional api host like https://ldap.dev.box.net/api
    files: [ '123', '234', ... ],    // optional list of file ids
    viewers: {                       // optional arguments to pass on to viewers
        Document: {                     // viewer class name
            disabled: true,             // disables the viewer
            annotations: true           // other args
            ...
        },
        ...
    },
    callbacks: {                                 // optional callbacks
        navigation: function(fileId) { ... },       // when navigation happens to fileId
        metrics: function(data) { ... }             // preview performance metrics
    }
}
```

```javascript
Box.Preview.hide(/* optional boolean */ destroy);
```
to hide and garbage collect the preview. If destroy is true, then container's contents are also removed. Clients are still responsible for hiding the container.


```javascript
Box.Preview.updateAuthToken(/* string */ token);
```
to update the auth token if needed, when it expires.

```javascript
Box.Preview.getViewer();
```
to get the current viewer. May return null till the viewer loads.

```javascript
Box.Preview.getViewers();
```
to get all the available viewers.

```javascript
Box.Preview.enableViewers(/* String|Array */ viewers);
```
to enable one or more viewers.

```javascript
Box.Preview.disableViewers(/* String|Array */ viewers);
```
to disable one or more viewers. Viewers can also be disabled by setting `disabled: true` on the viewer inside viewers options.

Test
----

1. `npm run karma`
2. open `index.html` in `coverage\`
