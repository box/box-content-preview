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
| load |  The preview loads | 1. {string} **error** (optional): error message 2. {object} **file**: current file 3. {object} **metrics**: information from the logger 4. {object} **viewer**: current viewer |
| notification | A notification is displayed ||
| navigate | The preview is shown for a given index | {object} file |
| reload | The preview reloads ||
| resize | The preview resizes | 1. {number} **height**: window height 2. {number} **width**: window width |
| ratechange | Media speed changes | {string} playback speed |
| volumechange | The media volume changes | {number} volume between 0 and 1|
| play | The audio plays ||
| pause | The audio pauses ||
| seeked | The audio skips to a time | {number} time |
