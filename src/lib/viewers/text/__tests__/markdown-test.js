/* eslint-disable no-unused-expressions */
import Markdown from '../markdown';

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
            expect(markdown.printPopup.show).to.have.been.called;
            expect(markdown.printPopup.disableButton).to.have.been.called;
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

            markdown.finishLoading('', true);

            expect(markdown.initRemarkable).to.have.been.called;
            expect(md.render).to.have.been.called;
            expect(markdown.loadUI).to.have.been.called;
            expect(markdown.emit).to.have.been.calledWith('load');
            expect(markdown.loaded).to.be.true;
            expect(markdown.textEl.classList.contains('box-preview-is-hidden')).to.be.false;
        });
    });
});
