# SWF Viewer

The SWF viewer uses [SWFObject] (https://github.com/swfobject/swfobject) to embed SWF files.

## Behavior

If the user has the Adobe Flash Player plugin, SWFObject will embed the SWF file and allow the plugin to render relevant content.

Note that all network requests made by the flash content will be blocked due to security constraints, so any content that requires network connectivity will not be rendered.

## Supported File Extensions

`swf`
