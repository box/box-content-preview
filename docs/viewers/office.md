# Office Viewer

The Office viewer renders previews of Microsoft Office documents by embedding an iframe of Microsoft's Office Online viewer.

## Screenshot

![Screenshot of office viewer](images/office.png)

## Behavior

The Office viewer currently supports previews of Excel files using Microsoft Office Online from within the Box Web Application. Support for platform use cases and other Office file formats is in progress.

There are several limitations at the moment:
- File must be downloadable
- File size cannot be greater than 5MB
- File cannot be shared via a Box shared link with a password (shared links without passwords are okay)

## Supported File Extensions

`xlsx`
