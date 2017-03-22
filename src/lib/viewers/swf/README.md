# SWF Viewer

The SWF viewer uses [SWFObject] (https://github.com/swfobject/swfobject) to embed SWF files.

## Behavior

If the user has the Adobe Flash Player plugin, SWFObject will embed the SWF file and allow the plugin to render relevant content.

Note that all network requests made by the flash content will be blocked due to security constraints, so any content that requires network connectivity will not be rendered.

## Supported File Extensions

`swf`

## Events
The SWF viewer fires the following events

| Event Name | Explanation | Event Data |
| --- | --- | --- |
| destroy | The preview is intentionally destroyed ||
| load |  The preview loads | 1. {string} **error** (optional): error message 2. {object} **file**: current file 3. {object} **metrics**: information from the logger 4. {object} **viewer**: current viewer |
| notification | A notification is displayed ||
| navigate | The preview is shown for a given index | {object} file |
| reload | The preview reloads ||
| resize | The preview resizes | 1. {number} **height**: window height 2. {number} **width**: window width |
