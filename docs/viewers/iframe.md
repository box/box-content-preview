# Iframe Viewer

The iframe viewer embeds an iframe to show content rendered from an external source. 

## Behavior

The iframe viewer is used for previews of Box Notes and Box DICOM files, and these previews currently only work from within the Box Web Application. Platform customers should use the [Box DICOM Viewer] (https://boxdicom.com/#viewer) to preview DICOM studies over the API.

Both Box Notes and Box DICOM have full-featured viewers within the main Box Web Application, but these full viewers are not initialized when users navigate from previews of other files that may be in the same directory as the Notes and DICOM files. In this situation, the iframe viewer embeds an view-only render of the Box Note or Box DICOM file.

## Supported File Extensions

`boxnote, boxdicom`
