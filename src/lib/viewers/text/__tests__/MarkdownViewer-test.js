/* eslint-disable no-unused-expressions */
import React from 'react';
import BaseViewer from '../../BaseViewer';
import ControlsRoot from '../../controls/controls-root';
import MarkdownControls from '../MarkdownControls';
import MarkdownViewer from '../MarkdownViewer';
import Popup from '../../../Popup';
import { linkify, Remarkable } from '../../../../third-party/text/2.65.0/remarkable.min.js';
import { TEXT_STATIC_ASSETS_VERSION, SELECTOR_BOX_PREVIEW } from '../../../constants';
import { VIEWER_EVENT } from '../../../events';

jest.mock('../../controls/controls-root');

let containerEl;
let markdown;
let rootEl;

describe('lib/viewers/text/MarkdownViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeAll(() => {
        global.remarkable = { linkify, Remarkable };
    });

    beforeEach(() => {
        fixture.load('viewers/text/__tests__/MarkdownViewer-test.html');
        containerEl = document.querySelector('.container');
        rootEl = document.querySelector(SELECTOR_BOX_PREVIEW);
        markdown = new MarkdownViewer({
            file: {
                id: 0,
            },
            container: containerEl,
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
        markdown.containerEl = containerEl;
        markdown.rootEl = rootEl;
        markdown.setup();
    });

    afterEach(() => {
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (markdown && typeof markdown.destroy === 'function') {
            markdown.destroy();
        }
        markdown = null;
    });

    describe('setup()', () => {
        test('should set up the markdown container', () => {
            expect(markdown.markdownEl).toHaveClass('markdown-body');
        });
    });

    describe('print()', () => {
        test('should print iframe if print is ready', () => {
            jest.spyOn(markdown, 'printIframe').mockImplementation();
            markdown.printReady = true;

            markdown.print();
            expect(markdown.printIframe).toBeCalled();
        });

        test('should prepare printing and show print popup if print is not ready', () => {
            jest.spyOn(markdown, 'preparePrint').mockImplementation();
            markdown.printReady = false;
            markdown.printPopup = {
                show: jest.fn(),
                disableButton: jest.fn(),
            };

            markdown.print();

            expect(markdown.preparePrint).toBeCalledWith([
                `third-party/text/${TEXT_STATIC_ASSETS_VERSION}/github.min.css`,
                `third-party/text/${TEXT_STATIC_ASSETS_VERSION}/github-markdown.min.css`,
                'preview.css',
            ]);
            expect(markdown.printPopup.show).toBeCalledWith('Preparing to print...', 'Print', expect.any(Function));
            expect(markdown.printPopup.disableButton).toBeCalled();
        });

        test('should hide print popup and print iframe when print button is clicked', () => {
            jest.spyOn(markdown, 'preparePrint').mockImplementation();
            markdown.printPopup = new Popup(containerEl);
            jest.spyOn(markdown.printPopup, 'isButtonDisabled').mockReturnValue(false);
            jest.spyOn(markdown.printPopup, 'hide').mockImplementation();
            jest.spyOn(markdown, 'printIframe').mockImplementation();

            markdown.print();
            const event = {
                preventDefault: () => {},
                stopPropagation: () => {},
                target: markdown.printPopup.buttonEl,
            };
            markdown.printPopup.popupClickHandler(event);

            expect(markdown.printPopup.hide).toBeCalled();
            expect(markdown.printIframe).toBeCalled();
        });
    });

    describe('finishLoading()', () => {
        test('should parse markdown and insert with innerHTML', () => {
            const content = '* sample markdown';
            const expectedMarkdown = '<ul>\n<li>sample markdown</li>\n</ul>';
            markdown.finishLoading(content);

            expect(markdown.markdownEl.innerHTML).toContain(expectedMarkdown);
        });

        test('should use custom renderer for links to add rel', () => {
            const content = 'https://sometestlink.com';
            const expectedMarkdown =
                '<a href="https://sometestlink.com" target="_blank" rel="noopener noreferrer">https://sometestlink.com</a>';

            markdown.finishLoading(content);
            expect(markdown.markdownEl.innerHTML).toContain(expectedMarkdown);
        });

        test('should finish loading, init markdown renderer, show the markdown, and emit load', () => {
            const md = {
                render: jest.fn(),
            };
            jest.spyOn(markdown, 'initRemarkable').mockReturnValue(md);
            jest.spyOn(markdown, 'loadUI');
            jest.spyOn(markdown, 'emit');

            markdown.finishLoading('');

            expect(markdown.initRemarkable).toBeCalled();
            expect(md.render).toBeCalled();
            expect(markdown.loadUI).toBeCalled();
            expect(markdown.emit).toBeCalledWith(VIEWER_EVENT.load);
            expect(markdown.loaded).toBe(true);
            expect(markdown.textEl.classList.contains('bp-is-hidden')).toBe(false);
        });

        test('should show truncated download button if text is truncated', () => {
            jest.spyOn(markdown, 'initRemarkable').mockReturnValue({
                render: () => {},
            });
            jest.spyOn(markdown, 'loadUI');
            jest.spyOn(markdown, 'emit');
            jest.spyOn(markdown, 'showTruncatedDownloadButton');
            markdown.truncated = true;

            markdown.finishLoading('');

            expect(markdown.showTruncatedDownloadButton).toBeCalled();
        });
    });

    describe('loadUI()', () => {
        test('should create controls root and render the controls', () => {
            markdown.loadUI();

            expect(markdown.controls).toBeInstanceOf(ControlsRoot);
            expect(markdown.controls.render).toBeCalledWith(
                <MarkdownControls onFullscreenToggle={markdown.toggleFullscreen} />,
            );
        });
    });
});
