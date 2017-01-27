# Text Viewer

The text viewer renders previews of text files and uses [highlight.js] (https://github.com/isagalaev/highlight.js) to add syntax highlighting to code files.

## Screenshot

![Screenshot of text viewer](images/text.png)

## Behavior

The text viewer displays the first 192KB of text in the file. Additional text is truncated and a notification and download button are appended to the bottom of the preview.

Re-sizing the viewer window will reflow the text to fit the available space and the zoom in and out buttons will increase and decrease font size respectively.

This viewer supports printing and will attempt to print with appropriate syntax highlighting when either `print()` is invoked or the print button is pressed. Note that printing large files may cause some browsers to hang for a few seconds.

### Controls:
* Zoom In
* Zoom Out
* Fullscreen: can be exited with the escape key

## Supported File Extensions

`as, as3, asm, bat, c, cc, cmake, cpp, cs, css, cxx, diff, erb, groovy, h, haml, hh, htm, html, java, js, less, m, make, md, ml, mm, php, pl, plist, properties, py, rb, rst, sass, scala, script, scm, sml, sql, sh, vi, vim, webdoc, xhtml, yaml`


## Events
The text viewer fires the following events

| Event Name | Explanation | Event Data |
| --- | --- | --- |
| destroy | The preview is intentionally destroyed ||
| load |  The preview loads | <ul> <li> **error** (optional): error message </li> <li> **file**: current file </li> <li> **metrics**: information from the logger </li> <li> **viewer**: current viewer </li> </ul> |
| notification | A notification is displayed ||
| navigate | The preview is shown for a given index | <ul> <li> **file**: current file </li> </ul> |
| reload | The preview reloads ||
| resize | The preview resizes |<ul> <li> **height**: window height </li> <li> **width**: window width </li> </ul> |
| scrollstart | The viewer starts to scroll | <ul> <li> {number} **scrollTop**: number of pixels scrolled from top of viewport </li> <li> {number} **scrollLeft**: number of pixels scrolled from left of viewport </li> </ul> |
| scrollend | The viewer stops scrolling | <ul> <li> {number} **scrollTop**: number of pixels scrolled from top of viewport </li> <li> {number} **scrollLeft**: number of pixels scrolled from left of viewport </li> </ul> |
| zoom | The preview zooms in or out | <ul> <li> {number} **zoom**: new zoom value </li> <li> {boolean} **canZoomIn**: true if the viewer can zoom in more </li> <li> {boolean} **canZoomOut**: true if the viewer can zoom out more </li> </ul> |
| printsuccess | An attempt to print triggered successfully ||
