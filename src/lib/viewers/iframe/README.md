# Iframe Viewer

The iframe viewer embeds an iframe to show content rendered from an external source.

## Behavior

The iframe viewer is used for previews of Box Notes and Box DICOM files, and these previews currently only work from within the Box Web Application. Platform customers should use the [Box DICOM Viewer] (https://boxdicom.com/#viewer) to preview DICOM studies over the API.

Both Box Notes and Box DICOM have full-featured viewers within the main Box Web Application, but these full viewers are not initialized when users navigate from previews of other files that may be in the same directory as the Notes and DICOM files. In this situation, the iframe viewer embeds an view-only render of the Box Note or Box DICOM file.

## Supported File Extensions

`boxnote, boxdicom`

## Events

The iframe viewer fires the following events

| Event Name | Explanation | Event Data |
| --- | --- | --- |
| destroy | The preview is intentionally destroyed ||
| load |  The preview loads | 1. {string} **error** (optional): error message 2. {object} **file**: current file 3. {object} **metrics**: information from the logger 4. {object} **viewer**: current viewer |
| notification | A notification is displayed ||
| navigate | The preview is shown for a given index | {object} file |
| reload | The preview reloads ||
| resize | The preview resizes | 1. {number} **height**: window height 2. {number} **width**: window width |
