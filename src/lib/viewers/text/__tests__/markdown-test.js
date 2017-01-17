/* eslint-disable no-unused-expressions */
import Markdown from '../markdown';
import Popup from '../../../popup';

let containerEl;
let markdown;
const sandbox = sinon.sandbox.create();

describe('markdown', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/text/__tests__/markdown-test.html');
        containerEl = document.querySelector('.container');
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        if (markdown && typeof markdown.destroy === 'function') {
            markdown.destroy();
        }

        markdown = null;
    });

    describe('Markdown()', () => {
        it('should set up the markdown container', () => {
            markdown = new Markdown(containerEl, {
                file: {
                    id: 0
                }
            });

            expect(markdown.markdownEl.classList.contains('markdown-body')).to.be.true;
        });
    });

    describe('print()', () => {
        beforeEach(() => {
            markdown = new Markdown(containerEl, {
                file: {
                    id: 0
                }
            });
        });

        it('should print iframe if print is ready', () => {
            sandbox.stub(markdown, 'printIframe');
            markdown.printReady = true;

            markdown.print();
            expect(markdown.printIframe).to.have.been.called;
        });

        it('should prepare printing and show print popup if print is not ready', () => {
            sandbox.stub(markdown, 'preparePrint');
            markdown.printReady = false;
            markdown.printPopup = {
                show: sandbox.stub(),
                disableButton: sandbox.stub()
            };

            markdown.print();

            expect(markdown.preparePrint).to.have.been.calledWith('third-party/text/github-markdown.css', 'third-party/text/github.css', 'markdown.css');
            expect(markdown.printPopup.show).to.have.been.calledWith('Preparing to print...', 'Print', sinon.match.func);
            expect(markdown.printPopup.disableButton).to.have.been.called;
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
        beforeEach(() => {
            markdown = new Markdown(containerEl, {
                file: {
                    id: 0
                }
            });
        });

        it('should parse markdown and insert with innerHTML', () => {
            const content = '* sample markdown';
            const expectedMarkdown = '<ul>\n<li>sample markdown</li>\n</ul>';
            markdown.finishLoading(content);

            expect(markdown.markdownEl.innerHTML).to.contain(expectedMarkdown);
        });

        it('should use custom renderer for links to add rel', () => {
            const content = 'https://sometestlink.com';
            const expectedMarkdown = '<a href="https://sometestlink.com" target="_blank" rel="noopener noreferrer">https://sometestlink.com</a>';

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

            expect(markdown.initRemarkable).to.have.been.called;
            expect(md.render).to.have.been.called;
            expect(markdown.loadUI).to.have.been.called;
            expect(markdown.emit).to.have.been.calledWith('load');
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
