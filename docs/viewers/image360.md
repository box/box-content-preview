# 360 Image Viewer

The 360 Image viewer renders a preview of an image stored as an equirectangular projection (often taken with a special camera).

## Screenshot

<img src=./image360.png />

## Behavior

This viewer gives you an interactive view of the 360 degree image. First, a low resolution version of the image is loaded to give a quick view before the full resolution image is finished loading.

### Controls:
* Change the view direction with the left mouse button (single touch on touch-enabled device).

### VR button
When using a browser that supports WebVR and a suitable VR device is attached to your computer, a VR button will be available to allow toggling in and out of VR mode.

## Limitations

Currently, this previewer requires that the file be named with a '.360' preceeding the file extension. This is so that Preview SDK knows to run this previewer rather than the standard image preview.

## Supported File Extensions

`'360.jpg', '360.jpeg', '360.png', '360.ai', '360.bmp', '360.dcm', '360.eps', '360.gif', '360.ps', '360.psd', '360.svg', '360.svs', '360.tga', '360.tif', '360.tiff'`

