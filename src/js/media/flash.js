'use strict';

import autobind from 'autobind-decorator';
import Promise from 'bluebird';
import Base from '../base';
import 'file?name=swfobject.js!../../third-party/swfobject.js';

let document = global.document;
let Box = global.Box || {};
let swfobject = global.swfobject;

const SWF_LOAD_TIMEOUT_IN_MILLIS = 10000;
const SWF_PARAMS = {
    allowfullscreen: 'true',
    allowFullScreen: 'true',
    allownetworking: 'none',
    allowNetworking: 'none',
    allowscriptaccess: 'never',
    allowScriptAccess: 'never',
    wmode: 'transparent'
};

const FLASH_XML = '<?xml version="1.0" encoding="UTF-8"?>' +
                    '<document>' +
                        '<versions>' +
                            '<version number="1" status="success" layout="continuous" autoscale="actual" scale="actual" low_fidelity="no">' +
                                '<video url="{{url}}"></video>' +
                            '</version>' +
                        '</versions>' +
                    '</document>';


@autobind
class Flash extends Base {

    /**
     * [constructor]
     * @param {string|HTMLElement} event The mousemove event
     * @param {object} [options] some options
     * @returns {Image}
     */
    constructor(container, options) {
        super(container, options);
        this.wrapperEl = this.containerEl.appendChild(document.createElement('div'));
        this.wrapperEl.className = CSS_CLASS_IMAGE;
        this.imageEl = this.wrapperEl.appendChild(document.createElement('img'));
        this.imageEl.addEventListener('mousedown', this.handleMouseDown);
        this.imageEl.addEventListener('mouseup', this.handleMouseUp);
        this.imageEl.addEventListener('dragstart', this.handleDragStart);
    }

    load(url) {
        $element = $(context.getElement());
        iconControls = dom.query('.preview-icon-play-pause', context.getElement());

        // @REVIEW(nsilva): Should we be directly accessing the lightbox?
        lightbox = context.getService('lightbox');
        controls = context.getService('preview-controls');

        initFlash();

        controls.on('zoomin', controlHandler);
        controls.on('zoomout', controlHandler);
        controls.on('rotateleft', controlHandler);
        controls.on('zoomtofit', controlHandler);
        controls.on('nextpage', controlHandler);
        controls.on('previouspage', controlHandler);
        controls.on('play', controlHandler);
        controls.on('pause', controlHandler);
        controls.on('seek', controlHandler);
        controls.on('volume', controlHandler);

        lightbox.on('toggleplay', togglePlay);
        lightbox.setType('flash');
    }

    
    var flashElement,
        $element,
        lightbox,
        controls,
        templates,
        hiddenClass = 'hidden_flash',
        isPlaying = false,
        iconControls, // the play pause control on the file type icon, currently only used by audio player
        iconControlsTimeoutHandler,
        dom = context.getService('dom'),
        AUTO_HIDE_TIMEOUT = 2000,
        PLAYING_CLASS = 'is-playing',
        PLAYING_CLASS_TIMEDOUT = 'is-timed-out';

    /**
     * Init flash player, mousewheel, etc
     * @returns {void}
     */
    initFlash() {
        var v5 = context.getService('v5'),
            browserService = context.getService('browser'),
            swfobject = v5.get('swfobject'),
            swfmacmousewheel = v5.get('swfmacmousewheel');

        if (typeof swfobject != 'undefined') {
            var flashvars = {
                backgroundColor: '#ffffff',
                conversion_on_realtime: true,
                lightbox_preview: true
            };
            var params = {
                allowfullscreen: 'true',
                allowscriptaccess: 'always',
                wmode: 'transparent'
            };

            // @NOTE - SWFObject treats the number 0 as undefined, so pass in strings for the width and height
            var flashPath = context.getService('assets').getFlashAssetURL();
            var flashFile = context.getService('assets').getAssetURL(flashPath, 'preview.swf');
            swfobject.embedSWF(flashFile, 'flash-player', '2', '2', browserService.getMinimumFlashVersion(), null, flashvars, params, {'class':hiddenClass + ' preview-content'});

            if (typeof swfmacmousewheel != 'undefined') {
                // Add scrollwheel support for Macs
                swfmacmousewheel.registerObject('flash-player');
            }
        }
        else {
            // FAIL
            $.error(new Error('swf object undefined'));
        }
    }


    /**
     * Continute initialization of the swf object when it is fully prepared by the swfobject method (external)
     * @returns {void}
     */
    continueInit() {
        isPlaying = false;

        var typedId = $element.attr('data-typed-id');
        flashElement = $element.find('object')[0];
        templates = context.getService('templates');

        var flashXML = templates.getTemplateHTML('flash_xml');

        // @TODO(dtong) for now we're just loading one item. Will need to add multiple later. Refer to flash_previewer.js
        var itemContextDataToLoad = [];
        itemContextDataToLoad[0] = {
            identifier: typedId,
            xml: flashXML
        };

        flashElement.updateFiles(itemContextDataToLoad, typedId);
    }

    /*
     * Resizes the Flash object to do one of two things: set width and height in the case of video
     * files or fill the screen otherwise
     * @param {object} [data] Event data object that may contain width and height
     * @param {Number} [data.width] Width of video if viewing a video file 
     * @param {Number} [data.height] Height of video if viewing a video file 
     * @returns {void}
     */
    resizeFlashObject(data) {
        if (data.width) {
            // 100% max-width and max-height prevents very large videos from extending beyond the browser edges
            // Not setting the height as the flash element is embdeed in a table-cell. Due to that the table-cell
            // would automatically set it's min-height to the height provided by its contents rather than letting the browser
            // set it automatically based on the dimensions of the viewport or it's own parent container.
            $(flashElement).css({width: data.width, 'max-width': '100%', 'max-height': '100%'});
        }
        $(flashElement).removeAttr('width').removeAttr('height');
        $(flashElement).removeClass(hiddenClass);
    }

    /**
     * Event Handlers for the control
     * @param {object} event Event type and additional data
     * @returns {boolean} TBD
     */
    controlHandler(event) {
        return flashElement.fire(event.type, event.data);
    }

    /*
     * Event Handler for ""toggleplay" event
     * @param {object} event Event type and additional data
     * @returns {void}
     */
    togglePlay(event)  {
        if (!isPlaying) {
            flashElement.fire('play', null);
        }
        else {
            flashElement.fire('pause', null);
        }
    }

    /**
     * Continute initialization when a ready message is broadcasted from the swf
     * @param {String} name The message name
     * @param {Object} data Information related to the broadcasted message
     */
    onmessage(name, data) {
        if (name === 'flashevent') {
            // data.type given by the Flash object
            switch (data.type) {
                case 'previewer_loaded':
                    continueInit();
                    break;
                case 'previewer_pagecount_determined':
                case 'previewer_first_page_shown':
                    if (data.duration) {
                        controls.setDuration(data.duration);
                    }
                    resizeFlashObject(data);
                    context.broadcast('previewloaded');
                    break;
                case 'previewer_scrubber_update':
                    controls.setTimecode(data.timecode);
                    controls.updateScrubber(data.handle, data.loaded);
                    break;
                case 'previewer_media_state_changed':
                    if (data.state === 'playing') {
                        startPlaying();
                    } else {
                        stopPlaying();
                    }
                    break;
                // no default
            }
        }
    }

    /**
     * Method to trigger the playing of the media file.
     * @private
     * @returns {void}
     */
    startPlaying() {
        isPlaying = true;
        controls.startPlaying();

        // If audio player
        if (iconControls) {
            // now that the pause button is showing, start listening to lightbox activity
            lightbox.on('lightboxactivity', makePauseButtonVisible);

            dom.addClass(iconControls, PLAYING_CLASS); // show the pause button
            makePauseButtonInvisible();
        }

    }

    /**
     * Method to stop the playing of the media file.
     * Removes the is-playing class. Removes the timedout class.
     * Clears any lingering timeouts.
     *
     * @private
     * @returns {void}
     */
    stopPlaying() {
        isPlaying = false;
        controls.stopPlaying();

        // If audio player
        if (iconControls) {
            // now that the play button is showing, stop listening to lightbox activity
            lightbox.off('lightboxactivity', makePauseButtonVisible);

            clearTimeout(iconControlsTimeoutHandler);
            dom.removeClass(iconControls, PLAYING_CLASS);
            dom.removeClass(iconControls, PLAYING_CLASS_TIMEDOUT);
        }
    }

    /**
     * Method to unhide the pause button by removing its timedout class.
     * After showing it, reset the timeout to hide it again.
     *
     * @private
     * @returns {void}
     */
    makePauseButtonVisible() {
        if (isPlaying) { // the pause button is showing
            dom.removeClass(iconControls, PLAYING_CLASS_TIMEDOUT);
            makePauseButtonInvisible();
        }
    }

    /**
     * Method to hide the pause button by adding a timedout class.
     * Happens on a timeout of a couple of seconds.
     *
     * @private
     * @returns {void}
     */
    makePauseButtonInvisible() {
        // Clear any lingering timeouts
        clearTimeout(iconControlsTimeoutHandler);

        iconControlsTimeoutHandler = setTimeout(function() {
            dom.addClass(iconControls, PLAYING_CLASS_TIMEDOUT);
        }, AUTO_HIDE_TIMEOUT);
    }


        

        destroy() {
            // @TODO(dtong) add a method off() to detach all events
            controls.off('zoomin', controlHandler);
            controls.off('zoomout', controlHandler);
            controls.off('rotateleft', controlHandler);
            controls.off('zoomtofit', controlHandler);
            controls.off('nextpage', controlHandler);
            controls.off('previouspage', controlHandler);
            controls.off('play', controlHandler);
            controls.off('pause', controlHandler);
            controls.off('seek', controlHandler);
            controls.off('volume', controlHandler);

            lightbox.off('toggleplay', togglePlay);

            if (iconControls) {
                clearTimeout(iconControlsTimeoutHandler);
                lightbox.off('lightboxactivity', makePauseButtonVisible);
            }
        },

        // @NOTE(nsilva) This is what Nicholas said to do.  We want there two be two messages, flashevent and flashresponse.
        // The message data distinguishes them.
        messages: ['flashevent'],

        onmessage: onmessage,

        /**
         * Method to start playing the media file.
         * @returns {void}
         */
        startPlaying: startPlaying,

        /**
         * Method to stop playing the media file.
         * @returns {void}
         */
        stopPlaying: stopPlaying,

        /** Handles the click event
         * @param {Event} event The event object
         * @param {HTMLElement} element The nearest element that contains a data-type attribute
         * @param {string} elementType The data-type attribute of the element
         * @returns {void}
         */
        onclick(event, element, elementType) {
            if (element && element.tagName === 'BUTTON') {
                if (elementType === 'play' || elementType === 'pause') {
                    event.preventDefault();
                    event.stopPropagation();
                    controlHandler({
                        type: elementType
                    });
                }
            }
        }
    };
});