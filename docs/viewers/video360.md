# 360 Video Viewer

The 360 video viewer renders a preview of a video stored as an equirectangular projection (often recorded with a special camera).

## Screenshot

<img src=./images/video360.png />

## Behavior

This viewer gives you an interactive view of the 360 degree video.

### Controls:
* Change the view direction with the left mouse button (single touch on touch-enabled device).

### VR button
When using a browser that supports WebVR and a suitable VR device is attached to your computer, a VR button will be available to allow toggling in and out of VR mode.

## Limitations

Currently, this previewer requires that the file be named with a '.360' preceeding the file extension. This is so that Preview SDK knows to run this previewer rather than the standard video preview.

## Supported File Extensions

`'360.3g2', '360.3gp', '360.avi', '360.m2v', '360.m2ts', '360.m4v', '360.mkv', '360.mov', '360.mp4', '360.mpeg', '360.mpg', '360.mts', '360.qt', '360.wmv'`

## Events
The 360 video viewer fires the following events

| Event Name | Explanation | Event Data |
| --- | --- | --- |
| destroy | The preview is intentionally destroyed ||
| load |  The preview loads | 1. {string} **error** (optional): error message 2. {object} **file**: current file 3. {object} **metrics**: information from the logger 4. {object} **viewer**: current viewer |
| notification | A notification is displayed ||
| navigate | The preview is shown for a given index | {object} file |
| reload | The preview reloads ||
| resize | The preview resizes | 1. {number} **height**: window height 2. {number} **width**: window width |
