# Document and Presentation Annotations

The document and presentation viewers supports highlight comment, highlight only, draw and point annotations.

<!-- ## Screenshot

![Screenshot of document point annotations](../../../../images/doc_point.png)

![Screenshot of document highlight annotations](../../../../images/doc_highlight.png)

![Screenshot of document draw  annotations](../../../../images/doc_draw.png) -->

## Supported File Extensions

`doc, docx, odp, ods, odt, pdf, ppt, pptx`

## Events
See [Box Annotations events](https://github.com/box/box-content-preview/src/lib/annotations/README.md#events).

## Methods

The following methods are available for the document viewer.

| Method Name | Explanation | Method Parameters |
| --- | --- | --- |
| getAnnotatedEl | Determines the annotated element in the viewer | {HTMLElement} containerEl ||
| createAnnotationThread | Creates the proper type of thread, adds it to in-memory map, and returns it. | {Annotation[]} annotations, {Object} location, {String} [annotation type] ||
| renderAnnotationsOnPage | Renders annotations on the current page, filters out disabled highlight types and scales the annotation canvases. | {number} page number |
| scaleAnnotationCanvases | Scales all annotation canvases for a specified page. | {number} page number||

## Point Annotations

### Annotation Thread

See [BoxAnnotations annotation thread methods and events](https://github.com/box/box-content-preview/src/lib/annotations/README.md#annotation-thread).

### Annotation Dialog

See [BoxAnnotations annotation dialog methods and events](https://github.com/box/box-content-preview/src/lib/annotations/README.md#annotation-dialog).

## Highlight Only and Highlight Comment Annotations

### Annotation Thread

**Methods**

The following methods are available for only highlight annotation threads.

| Method Name | Explanation | Method Parameters |
| --- | --- | --- |
| cancelFirstComment | Cancels the first comment in the thread |  ||
| isOnHighlight | Checks if Mouse event is either over the text highlight or the annotations dialog | {Event} mouse event ||
| activateDialog | Sets thread state to hover or active-hover accordingly and triggers dialog to remain open |  ||

### Annotation Dialog

**Methods**

The following methods are available for only highlight annotation dialogs.

| Method Name | Explanation | Method Parameters |
| --- | --- | --- |
| hideCommentsDialog | Set the state of the current highlight dialog so comments are hidden, if they're currently shown |  ||
| drawAnnotation | Emits a message to create and render a highlight |  ||
| toggleHighlightDialogs | Toggles between the highlight annotations buttons dialog and the highlight comments dialog. Dialogs are toggled based on whether the highlight annotation has text comments or not |  ||
| toggleHighlightIcon | Toggles the highlight icon color to a darker yellow based on if the user is hovering over the highlight to activate it | {string} RGBA fill style for highlight ||

## Draw Annotations

### Annotation Thread

**Methods**

The following methods are available for the annotation threads.

| Method Name | Explanation | Method Parameters |
| --- | --- | --- |
| hasPageChanged | Determine if the drawing in progress if a drawing goes to a different page | {Object} current location information ||

### Annotation Dialog

**Methods**

The following methods are available for the annotation dialogs.

| Method Name | Explanation | Method Parameters |
| --- | --- | --- |
| isVisible | Returns whether or not the dialog is able to be seen |  ||
