Box.Preview
============
Overview
-----------------
Use the Box Client-Side Preview SDK to embed a Preview of your Box file in your application. The SDK fetches representations through the Box Content API, chooses the appropriate viewer for the file type, and renders a preview of the file. The SDK currently supports most types of documents, images, videos, audio files, and 3D files.


Clone and compile
-----------------
1. `git clone git@gitenterprise.inside-box.net:Preview/Preview.git`
2. `cd Preview`
3. `npm install`
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

```javascript
Box.Preview.show(file, { options }).then(function(viewer) {
    // do something with the viewer object if needed
});
```
shows a preview. Clients are still responsible for showing the constainer if it was hidden.

* `file` is either a string file id OR JSON file object response from https://box-content.readme.io/reference#files
* `options` is an object with the following attribute
  * (required) `token` is the api auth token.
  * (optional) `api` is the api host like `https://ldap.dev.box.net/api`. Defaults to `https://api.box.com`.
  * (optional) `files` is either an array of string file ids OR an array of JSON file objects from the content api as shown above.
  * (optional) `container` is the container dom node for preview. Can be a CSS selector (e.g. '.className' or '#idName') or HTML node. If a container is supplied, it must be styled with a width and height. If no container is supplied, a container will be created that fills the viewport.
  * (optional) `sharedLink` is the fully qualified shared url that needs to passed on to the api.
  * (optional) `viewers` is a json object that has options for individual viewers with viewer name as the key.

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
