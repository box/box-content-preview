# Markdown Viewer

The Markdown viewer uses [Remarkable] (https://github.com/jonschlinkert/remarkable) to parse markdown files and [highlight.js] (https://github.com/isagalaev/highlight.js) to add syntax highlighting to code blocks contained within.

## Screenshot

![Screenshot of markdown viewer](images/markdown.png)

## Behavior

The Markdown viewer parses the first 192KB of raw markdown in the file and renders it using Github's Markdown style. Additional content is truncated and a notification along with a download button are appended to the bottom of the preview.

The viewer supports GFM (Github Flavored Markdown) as defined in https://guides.github.com/features/mastering-markdown/, including tables, syntax highlighting, and automatic URL linking.

Re-sizing the viewer window will reflow the markdown to fit the available space. Also, this viewer supports printing and will attempt to print the parsed markdown and with syntax highlighting on code when either `print()` is invoked or the print button is pressed. Note that printing large files may cause some browsers to hang for a few seconds.

### Controls:

* Fullscreen (can be exited with the escape key)

## Supported File Extensions

`md`

## Events
The Markdown viewer fires the following events

| Event Name | Explanation | Event Data |
| --- | --- | --- |
| destroy | The preview is intentionally destroyed ||
| load |  The preview loads | 1. {string} **error** (optional): error message 2. {object} **file**: current file 3. {object} **metrics**: information from the logger 4. {object} **viewer**: current viewer |
| notification | A notification is displayed ||
| navigate | The preview is shown for a given index | {object} file |
| reload | The preview reloads ||
| resize | The preview resizes | 1. {number} **height**: window height 2. {number} **width**: window width |
| printsuccess | An attempt to print triggered successfully ||
