import React from 'react';
import Controls from '../../Controls';
import MarkdownControls from './MarkdownControls';
import PlainTextViewer from './PlainTextViewer';
import { CLASS_HIDDEN, TEXT_STATIC_ASSETS_VERSION } from '../../constants';
import { ICON_FULLSCREEN_IN, ICON_FULLSCREEN_OUT } from '../../icons/icons';
import './Markdown.scss';
import { VIEWER_EVENT } from '../../events';

const STATIC_URI = `third-party/text/${TEXT_STATIC_ASSETS_VERSION}/`;

class MarkdownViewer extends PlainTextViewer {
    /**
     * @inheritdoc
     */
    setup() {
        if (this.isSetup) {
            return;
        }

        // Call super() first to set up common layout
        super.setup();

        this.codeEl.parentNode.removeChild(this.codeEl);
        this.codeEl = null;
        this.markdownEl = this.textEl.appendChild(document.createElement('article'));
        this.markdownEl.classList.add('markdown-body');
    }

    /**
     * Returns the name of the viewer
     *
     * @override
     * @return {string} text
     */
    getJS() {
        return super.getJS().concat(`${STATIC_URI}remarkable.min.js`);
    }

    /**
     * Returns the name of the viewer
     *
     * @override
     * @return {string} text
     */
    getCSS() {
        return super.getCSS().concat(`${STATIC_URI}github-markdown.min.css`);
    }

    /**
     * Prints text using an an iframe. Adds Github Markdown CSS to print styles.
     *
     * @override
     * @return {void}
     */
    print() {
        if (!this.printReady) {
            this.preparePrint(this.getCSS().concat('preview.css'));

            this.printPopup.show(__('print_loading'), __('print'), () => {
                this.printPopup.hide();
                this.printIframe();
            });

            this.printPopup.disableButton();
            return;
        }

        this.printIframe();
    }

    /**
     * Finishes loading by parsing Markdown and highlighting any necessary code.
     *
     * @override
     * @protected
     * @param {string} content - Markdown text
     * @return {void}
     */
    finishLoading(content) {
        const md = this.initRemarkable();
        this.markdownEl.innerHTML = md.render(content);

        if (this.options.useReactControls) {
            this.loadUIReact();
        } else {
            this.loadUI();
        }

        this.textEl.classList.remove(CLASS_HIDDEN);
        this.loaded = true;
        this.emit(VIEWER_EVENT.load);

        // Show message that text was truncated along with a download button
        if (this.truncated) {
            this.showTruncatedDownloadButton();
        }
    }

    /**
     * Loads controls for fullscreen. Markdown viewer doesn't have zoom in or out.
     *
     * @override
     * @protected
     * @return {void}
     */
    loadUI() {
        this.controls = new Controls(this.containerEl);
        this.controls.add(
            __('enter_fullscreen'),
            this.toggleFullscreen,
            'bp-enter-fullscreen-icon',
            ICON_FULLSCREEN_IN,
        );
        this.controls.add(__('exit_fullscreen'), this.toggleFullscreen, 'bp-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
    }

    renderUI() {
        if (this.options.useReactControls) {
            this.controls.render(<MarkdownControls onFullscreenToggle={this.toggleFullscreen} />);
        }
    }

    /**
     * Initializes and returns Remarkable parser.
     *
     * @private
     * @return {Remarkable} Remarkable parser instance
     */
    initRemarkable() {
        /* global Remarkable */
        /* istanbul ignore next */
        const md = new Remarkable({
            breaks: true, // convert '\n' in paragraphs into <br>
            linkify: true, // automatically URL-like text into links
            linkTarget: '_blank', // open links in new page
            typographer: true,
            /* global hljs */
            highlight: (str, lang) => {
                // Syntax highlight with specified language if available
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(lang, str).value;
                    } catch (err) {
                        // no-op
                    }
                }

                // Auto syntax highlight if language not provided
                try {
                    return hljs.highlightAuto(str).value;
                } catch (err) {
                    // no-op
                }

                // Use default escaping if no highlighting was successful
                return '';
            },
        });

        // Custom renderer for links to add rel="noopener noreferrer"
        const linkRenderer = md.renderer.rules.link_open;
        md.renderer.rules.link_open = (tokens, idx, options) => {
            const defaultOutput = linkRenderer(tokens, idx, options);
            return `${defaultOutput.slice(0, -1)} rel="noopener noreferrer">`;
        };

        return md;
    }
}

export default MarkdownViewer;
