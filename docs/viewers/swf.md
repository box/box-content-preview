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
| load |  The preview loads | <ul> <li> {string} **error** (optional): error message </li> <li> {object} **file**: current file </li> <li> {object} **metrics**: information from the logger </li> <li> {object} **viewer**: current viewer </li> </ul> |
| notification | A notification is displayed ||
| navigate | The preview is shown for a given index | <ul> <li> {object} file </li> </ul> |
| reload | The preview reloads ||
| resize | The preview resizes |<ul> <li> {number} **height**: window height </li> <li> {number} **width**: window width </li> </ul> |
