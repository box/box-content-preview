# Model3D Viewer

The Model3D viewer renders previews of 3d model files and allows you to enable different rendering modes to inspect various aspects of the model. e.g. wireframe, texture coords, etc. Animation data is also supported for files that contain it (e.g. box3d, fbx, dae).

## Screenshot

<img src=./images/model3d.png />

## Behavior

The 3d viewer gives you an interactive view of the model.

### Controls:

* Orbit about the model with the left mouse button (single touch on touch-enabled device).
* Zoom (change distance to the model) with the mouse wheel (or two-finger scroll on a touch-enabled device).
* Pan (lateral movement) with the right mouse button (or three-finger swipe on a touch-enabled device).
* Change orbit focus by double-clicking somewhere on the model.

### Settings (cog icon in toolbar):

The settings panel lets you select a "render" mode, toggle wireframe and skeleton visualizations, and change the type of camera projection. It also allows you to change the orientation of the model.

### Animation Selection:

When the model that is being viewed contains animations, two animation buttons will be visible in the toolbar. The first allows you to play and pause the animation and the second allows the selection of the current animation.

### VR button

When using a browser that supports WebVR and a suitable VR device is attached to your computer, a VR button will be available to allow toggling in and out of VR mode.

## Box3D Packages

Preview gives users the ability to view a single file within Box so, by default, you can't view textures on your model. However, the Box web application gives users the ability to create a Box3D package that combines all dependent files into a single file that can be shared and previewed. To do this, right-click the model file within Box and choose "Create 3D Package". All referenced files found within Box will be included in the resulting package.

## Supported File Extensions

`box3d, fbx, dae, 3ds, obj, stl, ply`

