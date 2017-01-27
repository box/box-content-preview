# Image Viewer

The image viewer renders previews of image files.

## Screenshot
![Screenshot of image viewer](images/image.png)

## Behavior
Rotating the viewer will rotate the image 90 degrees clockwise. At the default zoom level, clicking on the image will zoom in once. When zoomed in, clicking on the document will return to the default zoom level. When zoomed out, clicking on the document will zoom in until the original zoom level is reached.

### Controls:
* Zoom In
* Zoom Out
* Rotate
* Fullscreen: can be exited with the escape key

## Supported File Extensions

`ai, bmp, dcm, eps, gif, png, ps, psd, svs, tga, tif, tiff`

## Options

| Option | Type | Description |
| --- | --- | --- |
| annotations | boolean | Optional. Whether annotations on content are shown. Defaults to false |

## Events
The image viewer fires the following events

| Event Name | Explanation | Event Data |
| --- | --- | --- |
| destroy | The preview is intentionally destroyed ||
| load |  The preview loads | <ul> <li> **error** (optional): error message </li> <li> **file**: current file </li> <li> **metrics**: information from the logger </li> <li> **viewer**: current viewer </li> </ul> |
| notification | A notification is displayed ||
| navigate | The preview is shown for a given index | <ul> <li> **file**: current file </li> </ul> |
| reload | The preview reloads ||
| resize | The preview resizes |<ul> <li> **height**: window height </li> <li> **width**: window width </li> </ul> |
| zoom | The preview zooms in or out | <ul> <li> {number} **zoom**: new zoom value </li> <li> {boolean} **canZoomIn**: true if the viewer can zoom in more </li> <li> {boolean} **canZoomOut**: true if the viewer can zoom out more </li> </ul> |
| pan | The preview is panning ||
| panstart | Panning starts ||
| panend | Panning ends ||
| rotate | The image rotates ||
| printsuccess | An attempt to print triggered successfully ||
