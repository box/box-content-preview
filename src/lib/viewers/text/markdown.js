import autobind from 'autobind-decorator';
import marked from 'marked';

import './markdown.scss';
import Controls from '../../controls';
import PlainText from './text';
import { CLASS_HIDDEN } from '../../constants';
import {
    ICON_FULLSCREEN_IN,
    ICON_FULLSCREEN_OUT
} from '../../icons/icons';

const Box = global.Box || {};

@autobind
class Markdown extends PlainText {

    /**
     * [constructor]
     *
     * @param {string|HTMLElement} container The container
     * @param {Object} options some options
     * @returns {Markdown} Markdown instance
     */
    constructor(container, options) {
        super(container, options);

        this.codeEl.parentNode.removeChild(this.codeEl);
        this.codeEl = null;
        this.markdownEl = this.textEl.appendChild(document.createElement('article'));
        this.markdownEl.classList.add('markdown-body');
    }

    /**
     * Prints text using an an iframe. Adds Github Markdown CSS to print styles.
     *
     * @override
     * @returns {void}
     */
    print() {
        if (!this.printReady) {
            this.preparePrint('third-party/text/github-markdown.css', 'third-party/text/github.css', 'markdown.css');

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
     * @param {string} content - Markdown text
     * @returns {void}
     * @protected
     */
    finishLoading(content) {
        // Strip referrer from links using custom renderer
        const renderer = new marked.Renderer();
        renderer.link = (href, title, text) => {
            const linkTitle = title ? `title="${title}"` : '';
            return `<a href="${href}" ${linkTitle} rel="noopener noreferrer" target="_blank">${text}</a>`;
        };

        /* global hljs */
        marked.setOptions({
            breaks: true,
            highlight: (code) => hljs.highlightAuto(code).value,
            highlightClass: 'hljs',
            renderer
        });

        // Set innerHTML to parsed markdown
        this.markdownEl.innerHTML = marked(content);

        this.loadUI();
        this.textEl.classList.remove(CLASS_HIDDEN);
        this.loaded = true;
        this.emit('load');

        // Show message that text was truncated along with a download button
        if (this.truncated) {
            this.showTruncatedDownloadButton();
        }
    }

    /**
     * Loads controls for fullscreen. Markdown viewer doesn't have zoom in or out.
     *
     * @override
     * @returns {void}
     * @protected
     */
    loadUI() {
        this.controls = new Controls(this.containerEl);
        this.controls.add(__('enter_fullscreen'), this.toggleFullscreen, 'box-preview-enter-fullscreen-icon', ICON_FULLSCREEN_IN);
        this.controls.add(__('exit_fullscreen'), this.toggleFullscreen, 'box-preview-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Markdown = Markdown;
global.Box = Box;
export default Markdown;
