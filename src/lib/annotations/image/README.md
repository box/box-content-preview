# Image Annotations

The image and multi-page image viewers support point annotations.

## Screenshot

![Screenshot of image point annotations](../../../../images/image_point.png)

## Supported File Extensions

`ai, bmp, dcm, eps, gif, png, ps, psd, svs, tga, tif, tiff`

## Events
See BoxAnnotations events.

## Methods

The following methods are available for the document viewer.

| Method Name | Explanation | Method Parameters |
| --- | --- | --- |
| getAnnotatedEl | Determines the annotated element in the viewer | {HTMLElement} containerEl ||
| getLocationFromEvent | Returns an annotation location on an image from the DOM event or null if no correct annotation location can be inferred from the event. For point annotations, we return the (x, y) coordinates for the point with the top left corner of the image as the origin. | {Event} DOM event ||
| createAnnotationThread | Creates the proper type of thread, adds it to in-memory map, and returns it. | {Annotation[]} annotations, {Object} location, {String} [annotation type] ||
| hideAllAnnotations | Hides all annotations on the image. Also hides button in header that enables point annotation mode |  |
| showAllAnnotations | Shows all annotations on the image. Shows button in header that enables point annotation mode |  ||

Supported Annotation Types
--------------------
Point annotations are supported on image and multi-page image formats.

## Point Annotations
See BoxAnnotations annotation thread and dialog events.
