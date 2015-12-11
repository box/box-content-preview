Box.Preview
============

Clone and compile
-----------------
1. `git clone git@gitenterprise.inside-box.net:Preview/Preview.git`
2. `cd Preview`
3. `npm install`
4. `npm run build` (does a clean build)


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
  * (required) `api` is the api host like `https://api.box.com`.
  * (required) `token` is the api auth token.
  * (optional) `files` is either an array of string file ids OR an array of JSON file objects from the content api as shown above.
  * (optional) `container` is the container dom node for preview. Can be a selector or html node.
  * (optional) `sharedLink` is the fully qualified shared url that needs to passed on to the api.
  * (optional) `viewerOptions` json object to pass on to the viewer.

```javascript
Box.Preview.hide(/* optional boolean */ destroy);
```
to hide and garbage collect the preview. If destroy is true, then container's contents are also removed. Clients are still responsible for hiding the container.


```javascript
Box.Preview.updateAuthToken(/* string */ token);
```
to update the auth token if needed, when it expires.

Test
----

1. `npm run karma`
2. open `index.html` in `coverage\`
