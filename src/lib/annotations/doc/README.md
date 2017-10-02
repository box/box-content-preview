# Document and Presentation Annotations

The document and presentation viewers supports highlight comment, highlight only, draw and point annotations.

## Screenshot

![Screenshot of document point annotations](../../../../images/doc_point.png)

![Screenshot of document highlight annotations](../../../../images/doc_highlight.png)

![Screenshot of document draw  annotations](../../../../images/doc_draw.png)

## Supported File Extensions

`doc, docx, odp, ods, odt, pdf, ppt, pptx`

## Events
See BoxAnnotations events.

## Methods

The following methods are available for the document viewer.

| Method Name | Explanation | Method Parameters |
| --- | --- | --- |
| getAnnotatedEl | Determines the annotated element in the viewer | {HTMLElement} containerEl ||
| getLocationFromEvent | Returns an annotation location on a document from the DOM event or null if no correct annotation location can be inferred from the event. For point annotations, we return the (x, y) coordinates and page the point is on in PDF units with the lower left corner of the document as the origin. For highlight annotations, we return the PDF quad points as defined by the PDF spec and page the highlight is on | {Event} DOM event, {String} annotation type ||
| createAnnotationThread | Creates the proper type of thread, adds it to in-memory map, and returns it. | {Annotation[]} annotations, {Object} location, {String} [annotation type] ||
| renderAnnotationsOnPage | Override to factor in highlight types being filtered out, if disabled. Also scales annotation canvases. | {number} page number |
| scaleAnnotationCanvases | Scales all annotation canvases for a specified page. | {number} page number||

Supported Annotation Types
--------------------
Point, highlight comment, highlight only, and draw annotations are supported on document formats.

## Point Annotations

### Annotation Thread

**Methods**

See BoxAnnotations annotation thread events.

### Annotation Dialog

**Methods**

See BoxAnnotations annotation dialog events.

## Highlight Only and Highlight Comment Annotations

### Annotation Thread

**Methods**

The following methods are available for only highlight annotation threads.

| Method Name | Explanation | Method Parameters |
| --- | --- | --- |
| cancelFirstComment | Cancels the first comment in the thread |  ||
| onMousedown | Mousedown handler for thread. Deletes this thread if it is still pending |  ||
| onClick | Click handler for thread. If click is inside this highlight, set the state to be active, and return true. If not, hide the delete highlight button, set state to inactive, and reset. The 'consumed' param tracks whether or not some other click handler activated a highlight. If not, normal behavior occurs. If true, don't set the highlight to active when normally it should be activated. We don't draw active highlights in this method since we want to delay that drawing until all inactive threads have been reset | {Event} mouse event, {boolean} whether event previously activated another highlight ||
| isOnHighlight | Checks if Mouse event is either over the text highlight or the annotations dialog | {Event} mouse event ||
| activateDialog | Sets thread state to hover or active-hover accordingly and triggers dialog to remain open |  ||
| onMousemove | Mousemove handler for thread. If mouse is inside this highlight, set state to be hover and return true. If not, set state to be inactive, and reset. We don't draw hovered highlights in this method since we want to delay that drawing until all inactive threads have been reset | {Event} mouse event ||

### Annotation Dialog

**Methods**

The following methods are available for only highlight annotation dialogs.

| Method Name | Explanation | Method Parameters |
| --- | --- | --- |
| hideCommentsDialog | Set the state of the dialog so comments are hidden, if they're currently shown |  ||
| drawAnnotation | Emit the message to create a highlight and render it |  ||
| toggleHighlightDialogs | Toggles between the highlight annotations buttons dialog and the highlight comments dialog. Dialogs are toggled based on whether the highlight annotation has text comments or not |  ||
| toggleHighlightCommentsReply | Toggles between the "Add a comment here" and "Reply" text areas in the comments dialog. This accounts for when a blank highlight is created and then the user tries to add a comment after the fact. | {boolean} Whether or not the dialog has comments ||
| toggleHighlightIcon | Toggles the highlight icon color to a darker yellow based on if the user is hovering over the highlight to activate it | {string} RGBA fill style for highlight ||

## Draw Annotations

### Annotation Thread

**Methods**

The following methods are available for the annotation threads.

| Method Name | Explanation | Method Parameters |
| --- | --- | --- |
| handleMove | Handle a pointer movement | {Object} location information of the pointer ||
| handleStart | Start a drawing stroke | {Object} location information of the pointer ||
| handleStop | End a drawing stroke |  ||
| hasPageChanged | Determine if the drawing in progress if a drawing goes to a different page | {Object} current location information ||

### Annotation Dialog

**Methods**

The following methods are available for the annotation dialogs.

| Method Name | Explanation | Method Parameters |
| --- | --- | --- |
| isVisible | Returns whether or not the dialog is able to be seen |  ||
