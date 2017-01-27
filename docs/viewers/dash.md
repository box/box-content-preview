# DASH Viewer

The DASH viewer renders previews for video files using [shaka player](https://github.com/google/shaka-player).

## Screenshot

![Screenshot of DASH viewer](images/dash.png)


## Behavior

The DASH viewer uses a black background to create a more native viewing experience. Video is streamed in chunks of ____ at an initial quality determined automatically. Volume can be muted or unmuted by clicking the volume icon, or changed by dragging the volume scrubber. The position of the video can be changed by clicking or dragging the playback scrubber.

### Controls:

* Play/Pause
* Volume
* Settings
* Fullscreen (can be exited with the escape key)

### Settings (cog icon in toolbar):

* Video Speed: 0.25, 0.5, normal (1), 1.25, 1.5, 2.0
* Video Quality: 480p, 1080p, auto

## Supported File Extensions

`3g2, 3gp, avi, m2v, m2ts, m4v, mkv, mov, mp4, mpeg, mpg, ogg, mts, qt, wmv`

## Events
The DASH viewer fires the following events

| Event Name | Explanation | Event Data |
| --- | --- | --- |
| destroy | The preview is intentionally destroyed ||
| load |  The preview loads | <ul> <li> {string} **error** (optional): error message </li> <li> {object} **file**: current file </li> <li> {object} **metrics**: information from the logger </li> <li> {object} **viewer**: current viewer </li> </ul> |
| notification | A notification is displayed ||
| navigate | The preview is shown for a given index | <ul> <li> {object} file </li> </ul> |
| reload | The preview reloads ||
| resize | The preview resizes |<ul> <li> {number} **height**: window height </li> <li> {number} **width**: window width </li> </ul> |
| speedchange | The media speed changes | <ul> <li> {string} playback speed </li> </ul> |
| qualitychange | The video quality changes | <ul> <li>{string} media quality</li> </ul> |
| bandwidthhistory | Gives bandwidth history when the preview is destroyed | <ul> <li>  {array} bandwidth information </li> </ul> |
| switchhistory | Gives quality switching history when the preview is destroyed | <ul> <li> {array} quality switch objects </li> </ul> |
| adaptation | Quality adapts to a change in bandwidth | <ul> <li> {number} bandwidth </li> </ul> |
| play | The video plays ||
| pause | The video pauses ||
| seek | The video skips to a time | <ul> <li> {number} time </li> </ul> |
