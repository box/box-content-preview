[Box Annotations](https://developer.box.com/docs/getting-started-with-new-box-view#section-annotations)
====================================================================
Box Annotations allow developers to provide collaboration capabilities right from within the embedded Box preview in their application. Box Annotations fit a wide range of use cases and can be used to draw the previewer's attention and/or provide feedback on specific parts of a document or images. To learn more about Box Content Preview and for further documentation on how to use it, please go to our page on [Box Content Preview](https://developer.box.com/docs/box-content-preview).

Box Content Preview currently supports four annotation types - highlight comment, highlight only, draw, and point annotation. Box Annotations are today supported on documents and image previews only. You can find the full list of supported file types for Box Content Preview at https://community.box.com/t5/Managing-Your-Content/What-file-types-and-fonts-are-supported-by-Box-s-Content-Preview/ta-p/327#FileTypesSupported.

Browser Support
---------------
* Desktop Chrome, Firefox, Safari, Edge, and Internet Explorer 11
* Mobile support available for iOS Safari, Android Chrome

If you are using Internet Explorer 11, which doesn't natively support promises, include a polyfill.io script (see sample code below) or a Promise library like Bluebird.

Supported Locales
-----------------
To use a different locale, replace `en-US` in the URLs above with any of the following supported locales.

`en-AU`, `en-CA`, `en-GB`, `en-US`, `da-DK`, `de-DE`, `es-ES`, `fi-FI`, `fr-CA`, `fr-FR`, `it-IT`, `ja-JP`, `ko-KR`, `nb-NO`, `nl-NL`, `pl-PL`, `pt-BR`, `ru-RU`, `sv-SE`, `tr-TR`, `zh-CN`, `zh-TW`

<!-- Usage
-----
Box Annotations can be used either by including the JavaScript/CSS scripts linked above or by pulling from our [NPM package](https://www.npmjs.com/package/box-ui-elements).

CORS (Cross-Origin Resource Sharing)
------------------------------------
For security purposes, you must whitelist your application's HTTP origin, omitting any trailing slash, in the configuration section of the Developer Console. For example, CodePen's domain is whitelisted for the demo application below.

![Screenshot of CORS whitelist](images/cors.png)

Demo
----
View a demo and sample code on CodePen - http://codepen.io/box-platform/pen/rmZdjm. -->

Initialization
--------------
```javascript
/* global BoxAnnotations */
const boxAnnotations = new BoxAnnotations();
const annotatorConf = boxAnnotations.determineAnnotator(options, disabledAnnotationTypes);

// Construct and init annotator
const annotator = new annotatorConf.CONSTRUCTOR(options);

annotator.init(scale);
```
Where `disabledAnnotationTypes` is a string of valid annotation types to disable. See [Enabling/Disabling Annotations and Annotation Types](#enablingdisabling-annotations-and-annotation-types) below for more details on viewer specific annotation configurations.

Parameters & Options
-------
```javascript
const annotator = new annotatorConf.CONSTRUCTOR({
    annotator,
    apiHost,
    token,
    container,
    file: {
        id,
        file_version: {
            id
        },
        permissions
    },
    isMobile,
    hasTouch,
    locale,
    modeButtons: { // Annotation mode buttons, i.e. point, draw, etc
        point: {
            // Accessibilty message for the point annotation mode button
            title: 'Point annotation mode',
            // CSS selector for the point annotation mode button
            selector: '.bp-btn-annotate-point'
        },
    }
});
```

| Parameter | Description |
| --- | --- |
| annotator | Viewer-specific annotator configurations object |
| apiHost | Host for Box API calls i.e. 'https://app.box.com/api' |
| fileId | Box file ID |
| token | A string auth token, see below for details on how to generate annotator tokens with appropriate scopes |
| container | DOM node or selector where Preview should be placed |
| file | File metadata object |
| file.id | String `Box_File` id |
| file.file_version.id | String `Box_File_Version` id |
| file.permissions | File permissions object, see below on how to scope permissions  |
| modeButtons | Object containing a CSS selector and accessibility message for the annotation mode button, see parameters and options example above |

| Option | Default | Description |
| --- | --- | --- |
| isMobile | false | Whether the user's browser is on a mobile device |
| hasTouch | false | Whether the mobile browser has touch enabled |
| locale | en-US | Shared link URL |

Access Token
------------
Box Annotations needs an access token to make Box API calls. You can either get an access token from the token endpoint (https://developer.box.com/reference#token) or generate a developer token on your application management page (https://blog.box.com/blog/introducing-developer-tokens/).

If your application requires the end user to only be able to access a subset of the Annotations functionality, you can use [Token Exchange](https://developer.box.com/reference#token-exchange) to appropriately downscope your App/Managed or Service Account token to a resulting token that has the desired set of permissions, and can thus, be securely passed to the end user client initializing Annotations.

Below are a set of new Annotation-specific scopes to go alongside Token Exchange. These allow developers to enable/disable functionality on Box Annotations by configuring the appropriate scopes on the downscoped token. To learn more, see [Special Scopes for Box UI Elements](https://developer.box.com/v2.0/docs/special-scopes-for-box-ui-elements).

### Base Scope
| Scope Name | What permissions does it grant? |
| --- | --- |
| base_preview | Allows preview access to a file or files in a folder based on user/file/token permissions |

### Feature Scopes
| Scope Name | What permissions does it grant? |
| --- | --- |
| item_download | Allows files/folders contents to be downloaded |
| annotation_view_self | Allows user to view their own annotations |
| annotation_view_all | Allows user to view all annotations on the file |
| annotation_edit | Allows user to edit their own annotations (includes annotation_view_self) |

### Sample Scenarios
| Scenario| Scope Combinations |
| --- | --- |
| User wants basic preview functionality + ability to edit own annotations| base_preview + annotation_edit |
| User wants basic preview functionality + ability to edit own annotations + ability to select text on documents| base_preview + annotation_edit + item_download |
| User wants basic preview functionality + ability to view all annotations + ability to edit own annotations| base_preview + annotation_view_all + annotation_edit |
| User wants basic preview functionality + ability to view only their own annotations| base_preview + annotation_view_self |


Enabling/Disabling Annotations and Annotation Types
------------
Annotation types can be selectively disabled through preview options. Viewer options override global showAnnotations value, for that viewer. See [Box Content Preview](https://github.com/box/box-content-preview) for more details on how to set up the Preview instances that are used with Box Annotations here.
```
// Turn on/off annotations for all viewers
preview.show(..., {
    showAnnotations: Boolean
});
```
Combined with the following:
```
preview.show(..., {
    viewers: {
        VIEWER_NAME: {
            annotations: {
                enabled: Boolean, // Enables/disables if set. Respects "showAnnotations" if empty
                enabledTypes: String[] | null // List of annotation types to enable for this viewer. If empty, will respect default types for that annotator.
            }
        }
    }
});
```

### Example
Enable all annotations, turn off for Image Viewers, and enable only point annotations on Document viewer:
```
preview.show(fileId, token, {
    showAnnotations: true,
    viewers: {
        Image: {
            annotations: {
                enabled: false
            }
        },
        Document: {
            annotations: {
                enabled: true,
                enabledTypes: ['point']
            }
        }
    }
});
```

Annotators
-------
The name of an annotator can be one of the following `DocAnnotator` or `ImageAnnotator`. Call `boxAnnotations.getAnnotators()` to get the list of possible annotators.

Additional Methods
------------------
`annotator.init()` initializes the annotator.

`annotator.isModeAnnotatable(/* String */ type)` returns whether or not the current annotation mode is enabled for the current viewer/annotator.

`annotator.showModeAnnotateButton(/* String */ currentMode)` shows the annotate button for the specified annotation mode.

`annotator.getAnnotateButton(/* String */ annotatorSelector)` gets the annotation button element.

`annotator.showAnnotations()` fetches and shows saved annotations.

`annotator.hideAnnotations()` hides annotations.

`annotator.hideAnnotationsOnPage(/* number */ pageNum)` hides annotations on a specified page.

`annotator.setScale()` sets the zoom scale.

`annotator.toggleAnnotationHandler()` toggles annotation modes on and off. When an annotation mode is on, annotation threads will be created at that location.

`annotator.disableAnnotationMode(/* String */ mode, /* HTMLElement */ buttonEl)` disables the specified annotation mode.

`annotator.enableAnnotationMode(/* String */ mode, /* HTMLElement */ buttonEl)` enables the specified annotation mode.

`annotator.getAnnotatedEl(/* HTMLElement */ containerEl)` determines the annotated element in the viewer.

`annotator.createAnnotationThread(/* Annotation[] */ annotations, /* Object */ location, /* String */ [annotation type])` creates the proper type of annotation thread, adds it to the in-memory map, and returns it.

Events
------
Events can be bound to the annotator object with `addListener` and removed with `removeListener`. Event listeners should be bound before `showAnnotations()` is called, otherwise events can be missed.

```javascript
/* global BoxAnnotations */
const boxAnnotations = new BoxAnnotations();
const annotatorConf = boxAnnotations.determineAnnotator(options, disabledAnnotationTypes);

// Construct and init annotator
const annotator = new annotatorConf.CONSTRUCTOR(options);
var listener = (value) => {
    // Do something with value
};

// Attach listener before calling show otherwise events can be missed
annotator.addListener(EVENTNAME, listener);

// Initialize a annotator
annotator.showAnnotations();

// Remove listener when appropriate
annotator.removeListener(EVENTNAME, listener);
```

EVENTNAME can be one of the following

* `annotator` event will be fired when we have the annotator instance first available. Box Annotations fires this event before `load` so that clients can attach their listeners before the `load` event is fired from Box Content Preview.

* `annotationsfetched` event will be fired when annotations have been fetched from the Box API.

* `annotationmodeenter` event will be fired on when an annotation mode is entered. The event data will contain:
```javascript
  {
      mode: 'point', // Annotation mode that was entered
      headerSelector: '.bp-preview-header', // Optional CSS selector for the container's header
  }
```

* `annotationmodeexit` event will be fired on when an annotation mode is exited. The event data will contain:
```javascript
  {
      mode: 'point', // Annotation mode that was exited
      headerSelector: '.bp-preview-header', // Optional CSS selector for the container's header
  }
```

* `annotationerror` event will be fired when an annotation error has occured. The event data will contain:
```javascript
  {
      message: 'message', // Error message to show
  }
```

* `annotationpending` event will be fired when an annotation thread was created but has not yet been saved on the server. The event data will contain:
```javascript
  {
      data: {
          type: 'point', // Annotation type
          threadID: '123abc',
          userId: '456def',
          threadNumber: '1' // Thread number from Annotations API
      }
  }
```

* `annotationthreadsaved` event will be fired when an annotation thread was saved on the server. The event data will contain:
```javascript
  {
      data: {
          type: 'point', // Annotation type
          threadID: '123abc',
          userId: '456def',
          threadNumber: '1' // Thread number from Annotations API
      }
  }
```

* `annotationthreaddeleted` event will be fired when an annotation thread was deleted on the server. The event data will contain:
```javascript
  {
      data: {
          type: 'point', // Annotation type
          threadID: '123abc',
          userId: '456def',
          threadNumber: '1' // Thread number from Annotations API
      }
  }
```

* `annotationsaved` event will be fired when an annotation is added and saved to an existing annotation thread on the server. The event data will contain:
```javascript
  {
      data: {
          type: 'point', // Annotation type
          threadID: '123abc',
          userId: '456def',
          threadNumber: '1' // Thread number from Annotations API
      }
  }
```

* `annotationdeleted` event will be fired when an annotation is deleted from an existing thread on the server. The entire annotation thread is not deleted. The event data will contain:
```javascript
  {
      data: {
          type: 'point', // Annotation type
          threadID: '123abc',
          userId: '456def',
          threadNumber: '1' // Thread number from Annotations API
      }
  }
```

* `annotationcanceled` event will be fired when an annotation is cancelled from posting on either a new or existing thread. The event data will contain:
```javascript
  {
      data: {
          type: 'point', // Annotation type
          threadID: '123abc',
          userId: '456def',
          threadNumber: '1' // Thread number from Annotations API
      }
  }
```

* `annotationdeleteerror` event will be fired when an error occurs while deleting an annotation on either a new or existing thread. The event data will contain:
```javascript
  {
      data: {
          type: 'point', // Annotation type
          threadID: '123abc',
          userId: '456def',
          threadNumber: '1' // Thread number from Annotations API
      }
  }
```

* `annotationcreateerror` event will be fired when an error occurs while posting an annotation on either a new or existing thread. The event data will contain:
```javascript
  {
      data: {
          type: 'point', // Annotation type
          threadID: '123abc',
          userId: '456def',
          threadNumber: '1' // Thread number from Annotations API
      }
  }
```

* `annotatorevent` Each annotator will fire its own sets of events. For example, the Image Annotator will fire `rotate` or `resize`, etc. while other annotator may fire another set of events. The Annotator wrapper will also re-emit events at the Preview level in Box Content Preview, with event data containing:
```javascript
  {
      event: EVENTNAME,             // Event name
      data: DATA,                   // Event data object
      annotatorName: ANNOTATORNAME, // Name of the annotator
      fileVersionId: fileVersionId  // The file version id
      fileId: fileId                // The file id
  }
```

### Example event usage
```javascript
preview.addListener('annotator', (viewer) => {
    annotator.addListener('annotationsfetched', () => {
        // Do something when annotations are fetched on a preview
    });
});

// Event listeners can be attached to viewers
preview.addListener('load', (data) => {
    var viewer = data.viewer;
    viewer.addListener('annotationsfetched', () => {
        // Do something when annotations are fetched on a preview
    });
});

// Event listeners can be attached to annotators
preview.addListener('load', (data) => {
    var annotator = data.viewer.annotator;
    annotator.addListener('annotationsfetched', () => {
        // Do something when annotations are fetched on a preview
    });
});

preview.addListener('annotatorevent', (data) => {
    if (data.event === 'annotationsfetched') {
        // Do something when annotations are fetched on a preview
    } else if (data.event === 'annotationerror') {
        // Do something different when an annotation error has occurred
    } else {}
});

preview.addListener('annotatorevent', (data) => {
    if (data.viewerName === 'Image') {
        if (data.event === 'annotationsfetched') {
            // Do something when annotations are fetched on an image preview
        }
    } else if (data.viewerName === 'MultiImage') {
        if (data.event === 'annotationsfetched') {
            // Do something different when annotations are fetched on a multi-page image
        }
    } else {}
});

preview.addListener('annotationsfetched', (data) => {
    if (data.viewerName === 'Image') {
        // Do something when annotations are fetched on an image preview
    } else if (data.viewerName === 'MultiImage') {
        // Do something different when annotations are fetched on a multi-page image
    } else {}
});
```


Annotation Thread
--------------------

### Methods
The following methods are available for the annotation threads.

| Method Name | Explanation | Method Parameters |
| --- | --- | --- |
| createDialog | Creates the dialog for the thread |  ||
| show | Shows the annotation indicator |  ||
| hide | Hides the annotation indicator |  ||
| reset | Resets thread state to 'inactive' |  ||
| showDialog | Shows the appropriate dialog for this thread |  ||
| hideDialog | Hides the appropriate indicator for this thread |  ||
| saveAnnotation | Saves an annotation locally and on the server | {string} annotation type, {text} text of annotation to save ||
| deleteAnnotation | Deletes an annotation | {string} annotation ID, {boolean} whether or not to delete on server, default true ||

### Events
All annotation threads fire the following events. The event data will contain:
```javascript
  {
      data: {
          type: 'point', // Annotation type
          threadID: '123abc',
          userId: '456def',
          threadNumber: '1' // Thread number from Annotations API
      }
  }
```

| Event Name | Explanation |
| --- | --- |
| annotationpending | An annotation thread was created but has not yet been saved on the server. ||
| annotationthreadsaved | An annotation thread was saved on the server.  ||
| annotationthreaddeleted | An annotation thread was deleted on the server. ||
| annotationsaved | An annotation thread was added and saved to an existing annotation thread on the server  ||
| annotationdeleted | An annotation thread was deleted from an existing thread on the server. The entire annotation thread is not deleted. ||
| annotationcanceled | An annotation thread was cancelled from posting on either a new or existing thread. ||
| annotationdeleteerror | An error occurs while deleting an annotation on either a new or existing thread. ||
| annotationcreateerror | An error occurs while posting an annotation on either a new or existing thread. ||

See the **Events** section above for example event usage.

Annotation Dialog
--------------------

### Methods
The following methods are available for the annotation dialogs.

| Method Name | Explanation | Method Parameters |
| --- | --- | --- |
| show | Positions and shows the dialog |  ||
| hide | Hides the dialog |  ||
| hideMobileDialog | Hides and resets the shared mobile dialog |  ||
| addAnnotation | Adds an annotation to the dialog | {Annotation} annotation to add ||
| removeAnnotation | Removes an annotation from the dialog | {string} annotation ID ||
| postAnnotation | Posts an annotation in the dialog | {string} annotation text to post ||
| position | Positions the dialog |  ||

Supported Annotation Types
--------------------
Point annotations are supported on both document and image formats. Highlight comment, highlight only, and draw annotations are only supported on document formats.

### Document and Presentation Annotations

The document and presentation viewers supports highlight comment, highlight only, draw and point annotations.

<!-- ## Screenshot

![Screenshot of document point annotations](../../../../images/doc_point.png)

![Screenshot of document highlight annotations](../../../../images/doc_highlight.png)

![Screenshot of document draw  annotations](../../../../images/doc_draw.png) -->

#### Point Annotations

See BoxAnnotations annotation [thread methods/events](#annotation-thread) and [dialog methods/events](#annotation-dialog).

#### Highlight Only and Highlight Comment Annotations

The following methods are available for only highlight annotation threads.

| Method Name | Explanation | Method Parameters |
| --- | --- | --- |
| cancelFirstComment | Cancels the first comment in the thread |  ||
| isOnHighlight | Checks if Mouse event is either over the text highlight or the annotations dialog | {Event} mouse event ||
| activateDialog | Sets thread state to hover or active-hover accordingly and triggers dialog to remain open |  ||

The following methods are available for only highlight annotation dialogs.

| Method Name | Explanation | Method Parameters |
| --- | --- | --- |
| toggleHighlightDialogs | Toggles between the highlight annotations buttons dialog and the highlight comments dialog. Dialogs are toggled based on whether the highlight annotation has text comments or not |  ||
| toggleHighlightIcon | Toggles the highlight icon color to a darker yellow based on if the user is hovering over the highlight to activate it | {string} RGBA fill style for highlight ||

#### Draw Annotations

The following methods are available for the annotation threads.

| Method Name | Explanation | Method Parameters |
| --- | --- | --- |
| hasPageChanged | Determine if the drawing in progress if a drawing goes to a different page | {Object} current location information ||

The following methods are available for the annotation dialogs.

| Method Name | Explanation | Method Parameters |
| --- | --- | --- |
| isVisible | Returns whether or not the dialog is able to be seen |  ||

### Image Annotations

The image and multi-page image viewers support point annotations. The creation of annotations is disabled on rotated images.

<!-- ## Screenshot

![Screenshot of image point annotations](../../../../images/image_point.png) -->

#### Point Annotations

See BoxAnnotations annotation [thread methods/events](#annotation-thread) and [dialog methods/events](#annotation-dialog).
