# Markdown Viewer

The markdown viewer uses [Remarkable] (https://github.com/jonschlinkert/remarkable) to parse md files and [highlight.js] (https://github.com/isagalaev/highlight.js) to add syntax highlighting to code blocks contained within.

## Screenshot

![Screenshot of text viewer](images/markdown.png)

## Behavior

The markdown viewer parses the first 192KB of raw markdown in the file and renders it using Github's Markdown style. Additional content is truncated and a notification along with a download button are appended to the bottom of the preview.

The viewer supports GFM (Github Flavored Markdown) as defined in https://guides.github.com/features/mastering-markdown/, including tables, syntax highlighting, and automatic URL linking.

Re-sizing the viewer window will reflow the markdown to fit the available space. Also, this viewer supports printing and will attempt to print the parsed markdown and with syntax highlighting on code when either `print()` is invoked or the print button is pressed. Note that printing large files may cause some browsers to hang for a few seconds.

## Supported File Extensions

`md`
