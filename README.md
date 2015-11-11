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
1. `npm run props2js` to generate resource bundles (only if needed)
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
where
* `file` is either a string file id OR JSON file object response from https://box-content.readme.io/reference#files
* `options` is an object with the following attribute
  * (required) `api` is the api host.
  * (required) `token` is the api auth token.
  * (optional) `files` is either an array of string file ids OR an array of JSON file objects from the content api as shown above.
  * (optional) `container` is the container dom node for preview. Can be a selector or html node.


Test
----

1. `npm run karma`
2. open `index.html` in `coverage\`