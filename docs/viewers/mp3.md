# MP3 Viewer

the MP3 viewer displays previews for audio files.

## Screenshot
![Screenshot of MP3 viewer](images/mp3.png)

## Behavior
Volume can be muted or unmuted by clicking the volume icon, or changed by dragging the volume scrubber. The position of the audio can be changed by clicking or dragging the playback scrubber.

### Controls:
* Play/Pause
* Volume
* Settings

###Settings (cog icon in toolbar):

* Audio Speed: 0.25, 0.5, normal (1), 1.25, 1.5, 2.0


## Supported File Extensions

`aac, aif, aifc, aiff, amr, au, flac, m4a, mp3, ra, wav, wma`

## Events
The MP3 viewer fires the following events

| Event Name | Explanation | Event Data |
| --- | --- | --- |
| destroy | The preview is intentionally destroyed ||
| load |  The preview loads | <ul> <li> {string} **error** (optional): error message </li> <li> {object} **file**: current file </li> <li> {object} **metrics**: information from the logger </li> <li> {object} **viewer**: current viewer </li> </ul> |
| notification | A notification is displayed ||
| navigate | The preview is shown for a given index | <ul> <li> {object} file </li> </ul> |
| reload | The preview reloads ||
| resize | The preview resizes |<ul> <li> {number} **height**: window height </li> <li> {number} **width**: window width </li> </ul> |
| speedchange | Media speed changes | <ul> <li> {string} playback speed </li> </ul> |
| play | The video plays ||
| pause | The video pauses ||
| seek | The video skips to a time | <ul> <li> {number} time </li> </ul> |
