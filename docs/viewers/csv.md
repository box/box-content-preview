# CSV Viewer

The CSV viewer uses [PapaParse](https://github.com/mholt/PapaParse) to parse CSV and TSV files and [React Virtualized](https://github.com/bvaughn/react-virtualized) to display the parsed data in a table.

## Screenshot

![Screenshot of CSV viewer](images/csv.png)

## Behavior

Resizing the viewer window will cause the table to resize, and the zoom in and out buttons will increase and decrease font size respectively. Currently, column and row sizes are fixed and overflowing text will be truncated.

This viewer does not support printing.

### Controls:

* Zoom In
* Zoom Out
* Fullscreen (can be exited with the escape key)

## Supported File Extensions

`csv, tsv`

## Events
The CSV viewer fires the following events

| Event Name | Explanation | Event Data |
| --- | --- | --- |
| destroy | The preview is intentionally destroyed ||
| load |  The preview loads | <ul> <li> {string} **error** (optional): error message </li> <li> {object} **file**: current file </li> <li> {object} **metrics**: information from the logger </li> <li> {object} **viewer**: current viewer </li> </ul> |
| notification | A notification is displayed ||
| navigate | The preview is shown for a given index | <ul> <li> {object} file </li> </ul> |
| reload | The preview reloads ||
| resize | The preview resizes |<ul> <li> {number} **height**: window height </li> <li> {number} **width**: window width </li> </ul> |
| scrollstart | The viewer starts to scroll | <ul> <li> {number} **scrollTop**: number of pixels scrolled from top of viewport </li> <li> {number} **scrollLeft**: number of pixels scrolled from left of viewport </li> </ul> |
| scrollend | The viewer stops scrolling | <ul> <li> {number} **scrollTop**: number of pixels scrolled from top of viewport </li> <li> {number} **scrollLeft**: number of pixels scrolled from left of viewport </li> </ul> |
| zoom | The preview zooms in or out | <ul> <li> {number} **zoom**: new zoom value </li> <li> {boolean} **canZoomIn**: true if the viewer can zoom in more </li> <li> {boolean} **canZoomOut**: true if the viewer can zoom out more </li> </ul> |
