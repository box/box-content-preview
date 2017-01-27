# Presentation Viewer

The presentation viewer renders previews of powerpoint files.

## Screenshot
![Screenshot of presentation viewer](images/presentation.png)


## Behavior

The presentation viewer remembers which slide you were viewing upon closing the preview. The next time that file is opened, you will immediately be brought to that page. Scrolling the mouse up and down, or swiping up and down on mobile will transition between slides. Zooming in or out will increase or decrease the size of the slide respectively. If the zoom level causes the content to overflow, scrolling the mouse will allow you to scroll around the slide. To return to normal scrolling behavior, the user must zoom out until the overflow is removed.

### Controls:
* Zoom In
* Zoom Out
* Set Page: either with the up and down arrows, or by clicking the page number and entering text
* Fullscreen: can be exited with the escape key

## Supported File Extensions

`ppt, pptx, odp`

## Options

| Option | Type | Description |
| --- | --- | --- |
| annotations | boolean | Optional. Whether annotations on content are shown. Defaults  to false |

## Events
The presentation viewer fires the following events

| Event Name | Explanation | Event Data |
| --- | --- | --- |
| destroy | The preview is intentionally destroyed ||
| load |  The preview loads | <ul> <li> **error** (optional): error message </li> <li> **file**: current file </li> <li> **metrics**: information from the logger </li> <li> **viewer**: current viewer </li> </ul> |
| notification | A notification is displayed ||
| navigate | The preview is shown for a given index | <ul> <li> **file**: current file </li> </ul> |
| reload | The preview reloads ||
| resize | The preview resizes |<ul> <li> **height**: window height </li> <li> **width**: window width </li> </ul> |
| zoom | The preview zooms in or out | <ul> <li> {number} **zoom**: new zoom value </li> <li> {boolean} **canZoomIn**: true if the viewer can zoom in more </li> <li> {boolean} **canZoomOut**: true if the viewer can zoom out more </li> </ul> |
| pagerendered | A page renders | <ul> <li> pageNumber: page number that is rendered </ul> </li> |
| pagefocus | A page is visible | <ul> <li> pageNumber: page number that is focused </ul> </li> |
| scrollstart | The viewer starts to scroll | <ul> <li> scrollTop: number of pixels scrolled from top of viewport </li> <li> scrollLeft: number of pixels scrolled from left of viewport </li> </ul> |
| scrollend | The viewer stops scrolling | <ul> <li> scrollTop: number of pixels scrolled from top of viewport </li> <li> scrollLeft: number of pixels scrolled from left of viewport </li> </ul> |
