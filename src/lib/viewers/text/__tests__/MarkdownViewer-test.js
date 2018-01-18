/* eslint-disable no-unused-expressions */
import MarkdownViewer from '../MarkdownViewer';
import BaseViewer from '../../BaseViewer';
import Popup from '../../../Popup';
import { TEXT_STATIC_ASSETS_VERSION } from '../../../constants';
import { VIEWER_EVENT } from '../../../events';

let containerEl;
let markdown;
const sandbox = sinon.sandbox.create();

describe('lib/viewers/text/MarkdownViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/text/__tests__/MarkdownViewer-test.html');
        containerEl = document.querySelector('.container');
        markdown = new MarkdownViewer({
            file: {
                id: 0
            },
            container: containerEl
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.mock() });
        markdown.containerEl = containerEl;
        markdown.setup();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (markdown && typeof markdown.destroy === 'function') {
            markdown.destroy();
        }
        markdown = null;
    });

    describe('setup()', () => {
        it('should set up the markdown container', () => {
            expect(markdown.markdownEl).to.have.class('markdown-body');
        });
    });

    describe('print()', () => {
        it('should print iframe if print is ready', () => {
            sandbox.stub(markdown, 'printIframe');
            markdown.printReady = true;

            markdown.print();
            expect(markdown.printIframe).to.be.called;
        });

        it('should prepare printing and show print popup if print is not ready', () => {
            sandbox.stub(markdown, 'preparePrint');
            markdown.printReady = false;
            markdown.printPopup = {
                show: sandbox.stub(),
                disableButton: sandbox.stub()
            };

            markdown.print();

            expect(markdown.preparePrint).to.be.calledWith([
                `third-party/text/${TEXT_STATIC_ASSETS_VERSION}/github.min.css`,
                `third-party/text/${TEXT_STATIC_ASSETS_VERSION}/github-markdown.min.css`,
                'preview.css'
            ]);
            expect(markdown.printPopup.show).to.be.calledWith('Preparing to print...', 'Print', sinon.match.func);
            expect(markdown.printPopup.disableButton).to.be.called;
        });

        it('should hide print popup and print iframe when print button is clicked', () => {
            sandbox.stub(markdown, 'preparePrint');
            markdown.printPopup = new Popup(containerEl);
            sandbox.stub(markdown.printPopup, 'isButtonDisabled').returns(false);
            sandbox.stub(markdown.printPopup, 'hide');
            sandbox.stub(markdown, 'printIframe');

            markdown.print();
            const event = {
                preventDefault: () => {},
                stopPropagation: () => {},
                target: markdown.printPopup.buttonEl
            };
            markdown.printPopup.popupClickHandler(event);

            expect(markdown.printPopup.hide).to.be.called;
            expect(markdown.printIframe).to.be.called;
        });
    });

    describe('finishLoading()', () => {
        it('should parse markdown and insert with innerHTML', () => {
            const content = '* sample markdown';
            const expectedMarkdown = '<ul>\n<li>sample markdown</li>\n</ul>';
            markdown.finishLoading(content);

            expect(markdown.markdownEl.innerHTML).to.contain(expectedMarkdown);
        });

        it('should use custom renderer for links to add rel', () => {
            const content = 'https://sometestlink.com';
            const expectedMarkdown =
                '<a href="https://sometestlink.com" target="_blank" rel="noopener noreferrer">https://sometestlink.com</a>';

            markdown.finishLoading(content);
            expect(markdown.markdownEl.innerHTML).to.contain(expectedMarkdown);
        });

        it('should finish loading, init markdown renderer, show the markdown, and emit load', () => {
            const md = {
                render: sandbox.stub()
            };
            sandbox.stub(markdown, 'initRemarkable').returns(md);
            sandbox.stub(markdown, 'loadUI');
            sandbox.stub(markdown, 'emit');

            markdown.finishLoading('');

            expect(markdown.initRemarkable).to.be.called;
            expect(md.render).to.be.called;
            expect(markdown.loadUI).to.be.called;
            expect(markdown.emit).to.be.calledWith(VIEWER_EVENT.load);
            expect(markdown.loaded).to.be.true;
            expect(markdown.textEl.classList.contains('bp-is-hidden')).to.be.false;
        });

        it('should show truncated download button if text is truncated', () => {
            sandbox.stub(markdown, 'initRemarkable').returns({
                render: () => {}
            });
            sandbox.stub(markdown, 'loadUI');
            sandbox.stub(markdown, 'emit');
            sandbox.stub(markdown, 'showTruncatedDownloadButton');
            markdown.truncated = true;

            markdown.finishLoading('');

            expect(markdown.showTruncatedDownloadButton).to.be.called;
        });
    });
});
