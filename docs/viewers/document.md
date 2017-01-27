# Document Viewer

The document viewer renders previews for a variety of document types.

## Screenshot

![Screenshot of document viewer](images/document.png)

## Behavior

The document viewer remembers which page you were viewing upon closing the preview. The next time that file is opened, you will immediately be brought to that page. Resizing the viewer window will cause the document to resize.

### Controls:

* Zoom In
* Zoom Out
* Set Page: either with the up and down arrows, or by clicking the page number and entering text
* Fullscreen (can be exited with the escape key)

## Supported File Extensions

`as, as3, asm, bat, c, cc, cmake, cpp, cs, css, csv, cxx, diff, doc, docx, erb, gdoc, groovy, gsheet, h, haml, hh, htm, html, java, js, less, log, m, make, md, ml, mm, msg, odp, ods, odt, pdf, php, pl, plist, ppt, pptx, properties, py, rb, rst, rtf, sass, scala, scm, script, sh, sml, sql, tsv, txt, vi, vim, webdoc, wpd, xhtml, xls, xlsm, xlsx, xml, xsd, xsl, yaml`

## Options

| Option | Type | Description |
| --- | --- | --- |
| annotations | boolean | Optional. Whether annotations on content are shown. Defaults  to false |

## Events
The document viewer fires the following events

| Event Name | Explanation | Event Data |
| --- | --- | --- |
| destroy | The preview is intentionally destroyed ||
| load |  The preview loads | <ul> <li> {string} **error** (optional): error message </li> <li> {object} **file**: current file </li> <li> {object} **metrics**: information from the logger </li> <li> {object} **viewer**: current viewer </li> </ul> |
| notification | A notification is displayed ||
| navigate | The preview is shown for a given index | <ul> <li> {object} file </li> </ul> |
| reload | The preview reloads ||
| resize | The preview resizes |<ul> <li> {number} **height**: window height </li> <li> {number} **width**: window width </li> </ul> |
| zoom | The preview zooms in or out | <ul> <li> {number} **newScale**: new zoom value </li> <li> {boolean} **canZoomIn**: true if the viewer can zoom in more </li> <li> {boolean} **canZoomOut**: true if the viewer can zoom out more </li> </ul> |
| pagerendered | A page is rendered | <ul> <li> {number} page number </ul> </li> |
| pagefocus | A page is visible | <ul> <li> {number} page number </ul> </li> |
| scrollstart | The viewer starts to scroll | <ul> <li> {number} **scrollTop**: number of pixels scrolled from top of viewport </li> <li> {number} **scrollLeft**: number of pixels scrolled from left of viewport </li> </ul> |
| scrollend | The viewer stops scrolling | <ul> <li> {number} **scrollTop**: number of pixels scrolled from top of viewport </li> <li> {number} **scrollLeft**: number of pixels scrolled from left of viewport </li> </ul> |
| printsuccess | An attempt to print triggered successfully ||
| printsuccess | An attempt to print failed ||
