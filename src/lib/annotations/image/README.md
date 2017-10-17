# Image Annotations

The image and multi-page image viewers support point annotations.

<!-- ## Screenshot

![Screenshot of image point annotations](../../../../images/image_point.png) -->

## Supported File Extensions

`ai, bmp, dcm, eps, gif, png, ps, psd, svs, tga, tif, tiff`

## Events
See BoxAnnotations events.

## Methods

The following methods are available for the document viewer.

| Method Name | Explanation | Method Parameters |
| --- | --- | --- |
| getAnnotatedEl | Determines the annotated element in the viewer | {HTMLElement} containerEl ||
| createAnnotationThread | Creates the proper type of thread, adds it to in-memory map, and returns it. | {Annotation[]} annotations, {Object} location, {String} [annotation type] ||
| hideAllAnnotations | Hides all annotations on the image. Also hides button in header that enables point annotation mode |  |
| showAllAnnotations | Shows all annotations on the image. Shows button in header that enables point annotation mode |  ||

## Point Annotations

### Annotation Thread

See [BoxAnnotations annotation thread methods and events](https://github.com/box/box-content-preview/src/lib/annotations/README.md#annotation-thread).

### Annotation Dialog

See [BoxAnnotations annotation dialog methods and events](https://github.com/box/box-content-preview/src/lib/annotations/README.md#annotation-dialog).
