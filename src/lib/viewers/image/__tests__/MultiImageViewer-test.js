import React from 'react';
import * as util from '../../../util';
import BaseViewer from '../../BaseViewer';
import Browser from '../../../Browser';
import ControlsRoot from '../../controls/controls-root';
import ImageBaseViewer from '../ImageBaseViewer';
import MultiImageControls from '../MultiImageControls';
import MultiImageViewer from '../MultiImageViewer';
import PageControls from '../../../PageControls';
import ZoomControls from '../../../ZoomControls';
import fullscreen from '../../../Fullscreen';
import { CLASS_MULTI_IMAGE_PAGE } from '../../../constants';
import { ICON_FULLSCREEN_IN, ICON_FULLSCREEN_OUT } from '../../../icons/icons';

jest.mock('../../controls/controls-root');

const CLASS_INVISIBLE = 'bp-is-invisible';

let multiImage;
let stubs = {};
let options;
let containerEl;

describe('lib/viewers/image/MultiImageViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;
    const sizeFunc = ImageBaseViewer.prototype.setOriginalImageSize;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(Browser, 'isMobile').mockReturnValue(false);
        fixture.load('viewers/image/__tests__/MultiImageViewer-test.html');
        containerEl = document.querySelector('.container');
        stubs.emit = jest.spyOn(fullscreen, 'addListener');
        options = {
            file: {
                id: 100,
            },
            viewerAsset: '{page}.png',
            viewer: {
                ASSET: '{page}.png',
            },
            container: containerEl,
            representation: {
                content: {
                    url_template: 'link',
                },
                metadata: {
                    pages: 3,
                },
            },
        };

        stubs.singleImageEl = {
            src: undefined,
            setAttribute: jest.fn(),
            classList: {
                add: jest.fn(),
            },
            scrollIntoView: jest.fn(),
        };

        multiImage = new MultiImageViewer(options);

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
        Object.defineProperty(ImageBaseViewer.prototype, 'setOriginalImageSize', {
            value: jest.fn(() => Promise.resolve()),
        });
        multiImage.containerEl = containerEl;
        multiImage.setup();
    });

    afterEach(() => {
        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });
        Object.defineProperty(ImageBaseViewer.prototype, 'setOriginalImageSize', { value: sizeFunc });

        if (multiImage && multiImage.imagesEl) {
            multiImage.destroy();
        }

        stubs = {};

        fixture.cleanup();
        multiImage = null;
        containerEl = null;
    });

    describe('destroy()', () => {
        beforeEach(() => {
            jest.spyOn(multiImage, 'getRepStatus').mockReturnValue({ getPromise: jest.fn(() => Promise.resolve()) });
            stubs.bindImageListeners = jest.spyOn(multiImage, 'bindImageListeners');
            stubs.setupImageEls = jest.spyOn(multiImage, 'setupImageEls');
            stubs.unbindDOMListeners = jest.spyOn(multiImage, 'unbindDOMListeners');
            multiImage.singleImageEls = [
                {
                    removeEventListener: jest.fn(),
                },
                {
                    removeEventListener: jest.fn(),
                },
                {
                    removeEventListener: jest.fn(),
                },
            ];
        });

        test('should unbind the dom listeners', () => {
            multiImage.destroy();
            expect(stubs.unbindDOMListeners).toBeCalled();
        });

        test('should remove all the image listeners', () => {
            stubs.unbindImageListeners = jest.spyOn(multiImage, 'unbindImageListeners');

            multiImage.destroy();
            expect(stubs.unbindImageListeners).toBeCalledTimes(3);
        });
    });

    describe('load()', () => {
        beforeEach(() => {
            jest.spyOn(multiImage, 'getRepStatus').mockReturnValue({ getPromise: jest.fn(() => Promise.resolve()) });
            stubs.constructImageUrls = jest.spyOn(multiImage, 'constructImageUrls');
            stubs.bindDOMListeners = jest.spyOn(multiImage, 'bindDOMListeners');
            stubs.bindImageListeners = jest.spyOn(multiImage, 'bindImageListeners');
            stubs.setupImageEls = jest.spyOn(multiImage, 'setupImageEls');
            multiImage.wrapperEl = {
                addEventListener: jest.fn(),
            };
            stubs.addWrapperListener = multiImage.wrapperEl.addEventListener;
        });

        test('should create the image urls', () => {
            return multiImage
                .load('file/100/content/{page}.png')
                .then(() => {
                    expect(stubs.constructImageUrls).toBeCalled();
                })
                .catch(() => {});
        });

        test('should add various listeners', () => {
            return multiImage
                .load('file/100/content/{page}.png')
                .then(() => {
                    expect(stubs.bindImageListeners).toBeCalled();
                    expect(stubs.bindDOMListeners).toBeCalled();
                    expect(stubs.constructImageUrls).toBeCalled();
                    expect(stubs.addWrapperListener).toBeCalledWith('scroll', expect.any(Function), 'true');
                })
                .catch(() => {});
        });

        test('should make the images invisible', () => {
            return multiImage
                .load('file/100/content/{page}.png')
                .then(() => {
                    expect(multiImage.imageEl).toHaveClass(CLASS_INVISIBLE);
                })
                .catch(() => {});
        });

        test('should ensure load timer is started', () => {
            jest.spyOn(multiImage, 'startLoadTimer');
            return multiImage
                .load('file/100/content/{page}.png')
                .then(() => {
                    expect(multiImage.startLoadTimer).toBeCalled();
                })
                .catch(() => {});
        });
    });

    describe('constructImageUrls()', () => {
        test('should remove both the new and old form of asset path', () => {
            const firstURL = 'file/100/content/1.png';
            const result = multiImage.constructImageUrls('file/100/content/{page}.png');

            expect(result[0]).toBe(firstURL);

            multiImage.options = {
                viewerAsset: '{asset_path}',
                viewer: {
                    ASSET: '{page}.png',
                },
                representation: {
                    metadata: {
                        pages: 3,
                    },
                },
            };
            const result2 = multiImage.constructImageUrls('file/100/content/{+asset_path}');
            expect(result2[0]).toBe(firstURL);
        });

        test('should create a URL for each page', () => {
            const result = multiImage.constructImageUrls('file/100/content/{page}.png');
            expect(result.length).toBe(3);
        });
    });

    describe('setupImageEls()', () => {
        beforeEach(() => {
            multiImage.setup();
            stubs.bindImageListeners = jest.spyOn(multiImage, 'bindImageListeners');
        });

        test('should set the single image el and error handler if it is not the first image', () => {
            multiImage.singleImageEls = [null, stubs.singleImageEl];

            multiImage.setupImageEls('file/100/content/{page}.png', 1);
            expect(multiImage.singleImageEls[1].src).toBeDefined();
            expect(stubs.bindImageListeners).toBeCalled();
        });

        test('should set the image source', () => {
            multiImage.singleImageEls = [stubs.singleImageEl];

            multiImage.setupImageEls('file/100/content/{page}.png', 0);
            expect(multiImage.singleImageEls[0].src).toBe('file/100/content/{page}.png');
        });

        test('should set the page number for each image el', () => {
            multiImage.singleImageEls = [stubs.singleImageEl];

            multiImage.setupImageEls('file/100/content/{page}.png', 0);
            expect(stubs.singleImageEl.setAttribute).toBeCalledWith('data-page-number', 1);
        });

        test('should add the "page" class to all image pages', () => {
            multiImage.singleImageEls = [stubs.singleImageEl];

            multiImage.setupImageEls('file/100/content/{page}.png', 0);
            expect(stubs.singleImageEl.classList.add).toBeCalledWith(CLASS_MULTI_IMAGE_PAGE);
        });
    });

    describe('setOriginalImageSizes()', () => {
        beforeEach(() => {
            multiImage.singleImageEls = [stubs.singleImageEl, stubs.singleImageEl, stubs.singleImageEl];
        });

        test('should return a promise', () => {
            const promise = multiImage.setOriginalImageSizes();
            expect(promise).toBeInstanceOf(Promise);
        });

        test('should return a promise that resolves after each image has a proper size', done => {
            // We've overridden super.setOriginalImageSize() to resolve immediately
            multiImage.setOriginalImageSizes().then(() => {
                done();
            });
        });
    });

    describe('updatePannability()', () => {
        beforeEach(() => {
            stubs.updateCursor = jest.spyOn(multiImage, 'updateCursor');
            multiImage.setup();
        });

        test('should do nothing if there is no wrapper', () => {
            multiImage.wrapperEl = null;
            multiImage.updatePannability();
            expect(stubs.updateCursor).not.toBeCalled();
        });

        test('should become pannable if the page width exceeds the wrapper width', () => {
            Object.defineProperty(multiImage.imageEl, 'clientWidth', { value: 100 });
            Object.defineProperty(multiImage.wrapperEl, 'clientWidth', { value: 50 });

            multiImage.updatePannability();
            expect(multiImage.isPannable).toBe(true);
        });

        test('should become not pannable if the page width exceeds the wrapper width', () => {
            Object.defineProperty(multiImage.imageEl, 'clientWidth', { value: 10 });
            Object.defineProperty(multiImage.wrapperEl, 'clientWidth', { value: 50 });

            multiImage.updatePannability();
            expect(multiImage.isPannable).toBe(false);
        });

        test('should set did pan to false and update the cursor', () => {
            multiImage.updatePannability();
            expect(multiImage.didPan).toBe(false);
            expect(stubs.updateCursor).toBeCalled();
        });
    });

    describe('zoom()', () => {
        const clientWidth = {
            get() {
                return parseInt(this.style.width, 10);
            },
        };

        beforeEach(() => {
            stubs.zoomEmit = jest.spyOn(multiImage, 'emit').mockImplementation();
            stubs.setScale = jest.spyOn(multiImage, 'setScale').mockImplementation();
            stubs.scroll = jest.spyOn(multiImage, 'setPage').mockImplementation();
            stubs.updatePannability = jest.spyOn(multiImage, 'updatePannability').mockImplementation();

            multiImage.setup();
            multiImage.imageEl.style.width = '100px';

            Object.defineProperty(multiImage.imageEl, 'clientWidth', clientWidth);
            Object.defineProperty(multiImage.imageEl.parentNode, 'clientWidth', clientWidth);
        });

        test('should increase the width by 100px on zoom in', () => {
            multiImage.imageEl.parentNode.style.width = '100px';
            multiImage.zoom('in');
            expect(multiImage.imageEl.style.width).toBe('200px');
        });

        test('should decrease the width by 100px on zoom out', () => {
            multiImage.imageEl.parentNode.style.width = '100px';
            multiImage.zoom('out');
            expect(multiImage.imageEl.style.width).toBe('0px');
        });

        test('should reset the viewport width on default', () => {
            multiImage.imageEl.parentNode.style.width = '200px';
            multiImage.zoom('in');
            expect(multiImage.imageEl.parentNode.style.width).toBe('200px');
        });

        test('should emit the zoom event, set a timeout to update pannability, and set the current scale', () => {
            multiImage.zoom();
            jest.advanceTimersByTime(51);
            expect(stubs.zoomEmit).toBeCalledWith('zoom');
            expect(stubs.updatePannability).toBeCalled();
            expect(stubs.setScale).toBeCalledWith(expect.any(Number), expect.any(Number));
        });
    });

    describe('setScale()', () => {
        test('should set the scale relative to the size of the first image dimensions', () => {
            multiImage.zoomControls = {
                setCurrentScale: jest.fn(),
                removeListener: jest.fn(),
            };

            multiImage.singleImageEls = [
                {
                    naturalWidth: 1024,
                    naturalHeight: 1024,
                },
                {
                    src: 'www.NotTheRightImage.net',
                },
            ];
            jest.spyOn(multiImage, 'emit');

            multiImage.setScale(512, 512);
            expect(multiImage.emit).toBeCalledWith('scale', { scale: 0.5 });
            expect(multiImage.zoomControls.setCurrentScale).toBeCalledWith(0.5);
        });
    });

    describe('loadUI()', () => {
        const zoomInitFunc = ZoomControls.prototype.init;

        beforeEach(() => {
            Object.defineProperty(ZoomControls.prototype, 'init', { value: jest.fn() });
        });

        afterEach(() => {
            Object.defineProperty(ZoomControls.prototype, 'init', { value: zoomInitFunc });
        });

        test('should create page controls and bind the page control listeners', () => {
            stubs.bindPageControlListeners = jest.spyOn(multiImage, 'bindPageControlListeners');

            multiImage.loadUI();
            expect(multiImage.pageControls instanceof PageControls).toBe(true);
            expect(multiImage.pageControls.contentEl).toBe(multiImage.wrapperEl);
            expect(multiImage.zoomControls instanceof ZoomControls).toBe(true);
            expect(stubs.bindPageControlListeners).toBeCalled();
            expect(ZoomControls.prototype.init).toBeCalled();
        });
    });

    describe('loadUIReact()', () => {
        test('should create controls root and render the react controls', () => {
            multiImage.options.useReactControls = true;
            multiImage.loadUIReact();

            expect(multiImage.controls).toBeInstanceOf(ControlsRoot);
            expect(multiImage.controls.render).toBeCalledWith(
                <MultiImageControls
                    onFullscreenToggle={multiImage.toggleFullscreen}
                    onPageChange={multiImage.setPage}
                    onZoomIn={multiImage.zoomIn}
                    onZoomOut={multiImage.zoomOut}
                    pageCount={multiImage.pagesCount}
                    pageNumber={multiImage.currentPageNumber}
                    scale={1}
                    viewer={multiImage.wrapperEl}
                />,
            );
        });
    });

    describe('bindPageControlListeners()', () => {
        beforeEach(() => {
            multiImage.currentPageNumber = 1;
            multiImage.pagesCount = 10;
            multiImage.pageControls = {
                add: jest.fn(),
                addListener: jest.fn(),
            };

            multiImage.controls = {
                add: jest.fn(),
            };
        });

        test('should add the page controls and bind the pagechange listener', () => {
            multiImage.bindPageControlListeners();

            expect(multiImage.pageControls.add).toBeCalledWith(multiImage.currentPageNumber, multiImage.pagesCount);
            expect(multiImage.pageControls.addListener).toBeCalledWith('pagechange', multiImage.setPage);
        });

        test('should finish binding the document controls', () => {
            multiImage.bindPageControlListeners();

            expect(multiImage.controls.add).toBeCalledWith(
                __('enter_fullscreen'),
                multiImage.toggleFullscreen,
                'bp-enter-fullscreen-icon',
                ICON_FULLSCREEN_IN,
            );
            expect(multiImage.controls.add).toBeCalledWith(
                __('exit_fullscreen'),
                multiImage.toggleFullscreen,
                'bp-exit-fullscreen-icon',
                ICON_FULLSCREEN_OUT,
            );
        });
    });

    describe('handleMultiImageDownloadError()', () => {
        beforeEach(() => {
            multiImage.singleImageEls = [
                {
                    src: 'foo',
                },
                {
                    src: 'baz',
                },
            ];

            jest.spyOn(multiImage, 'handleDownloadError').mockImplementation();
            jest.spyOn(multiImage, 'unbindImageListeners').mockImplementation();
        });

        test('unbind the image listeners, clear the image Els array, and handle the download error', () => {
            const { src } = multiImage.singleImageEls[0];

            multiImage.handleMultiImageDownloadError('err');

            expect(multiImage.singleImageEls).toEqual([]);
            expect(multiImage.handleDownloadError).toBeCalledWith('err', src);
            expect(multiImage.unbindImageListeners).toBeCalledTimes(2);
        });
    });

    describe('bindImageListeners()', () => {
        beforeEach(() => {
            multiImage.singleImageEls = [
                {
                    addEventListener: jest.fn(),
                },
                {
                    addEventListener: jest.fn(),
                },
            ];
        });

        test('should add the load event listener to the first image', () => {
            multiImage.bindImageListeners(0);
            expect(multiImage.singleImageEls[0].addEventListener).toBeCalledWith('load', expect.any(Function));
        });

        test('should add the error event listener', () => {
            multiImage.bindImageListeners(1);
            expect(multiImage.singleImageEls[1].addEventListener).toBeCalledWith('error', expect.any(Function));
        });
    });

    describe('unbindImageListeners()', () => {
        beforeEach(() => {
            multiImage.singleImageEls = [
                {
                    removeEventListener: jest.fn(),
                },
                {
                    removeEventListener: jest.fn(),
                },
            ];
        });

        test('should remove the load event listener from the first image', () => {
            multiImage.unbindImageListeners(0);
            expect(multiImage.singleImageEls[0].removeEventListener).toBeCalledWith('load', expect.any(Function));
        });

        test('should remove the error event listener', () => {
            multiImage.unbindImageListeners(1);
            expect(multiImage.singleImageEls[1].removeEventListener).toBeCalledWith('error', expect.any(Function));
        });
    });

    describe('setPage()', () => {
        beforeEach(() => {
            multiImage.singleImageEls = [null, stubs.singleImageEl, stubs.singleImageEl, stubs.singleImageEl];
            jest.spyOn(multiImage, 'emit');
            stubs.isValidPageChange = jest.spyOn(multiImage, 'isValidPageChange');
            stubs.updateCurrentPage = jest.spyOn(multiImage, 'updateCurrentPage');
        });

        test('should do nothing if the page change is invalid', () => {
            multiImage.setPage(-2);
            expect(multiImage.singleImageEls[2].scrollIntoView).not.toBeCalled();
        });

        test('should scroll the set page into view', () => {
            stubs.isValidPageChange.mockReturnValue(true);

            multiImage.setPage(2);
            expect(stubs.singleImageEl.scrollIntoView).toBeCalled();
        });

        test('should update the current page number', () => {
            stubs.isValidPageChange.mockReturnValue(true);

            multiImage.setPage(2);
            expect(stubs.updateCurrentPage).toBeCalledWith(2);
        });
    });

    describe('updateCurrentPage()', () => {
        beforeEach(() => {
            stubs.isValidPageChange = jest.spyOn(multiImage, 'isValidPageChange');
            multiImage.pageControls = {
                updateCurrentPage: jest.fn(),
            };

            stubs.emit = jest.spyOn(multiImage, 'emit');
            multiImage.currentPageNumber = 1;
        });

        test('should do nothing if the requested page change is invalid', () => {
            stubs.isValidPageChange.mockReturnValue(false);

            multiImage.updateCurrentPage(3);
            expect(multiImage.currentPageNumber).toBe(1);
        });

        test('should set the current page number and update the page controls', () => {
            stubs.isValidPageChange.mockReturnValue(true);

            multiImage.updateCurrentPage(3);
            expect(multiImage.currentPageNumber).toBe(3);
            expect(multiImage.pageControls.updateCurrentPage).toBeCalledWith(3);
        });

        test('should emit the pagefocus event', () => {
            stubs.isValidPageChange.mockReturnValue(true);

            multiImage.updateCurrentPage(3);
            expect(stubs.emit).toBeCalledWith('pagefocus', { pageNumber: 3 });
        });
    });

    describe('isValidPageChange()', () => {
        beforeEach(() => {
            multiImage.pagesCount = 10;
            multiImage.currentPageNumber = 3;
        });

        test('should return false if the page number is less thatn one', () => {
            const result = multiImage.isValidPageChange(0);
            expect(result).toBe(false);
        });

        test('should return false if the page number is greater than the number of pages', () => {
            const result = multiImage.isValidPageChange(11);
            expect(result).toBe(false);
        });

        test('should return false if the page number is the same as the current page number', () => {
            const result = multiImage.isValidPageChange(3);
            expect(result).toBe(false);
        });

        test('should return true if the page number is in the range of valid pages', () => {
            let result = multiImage.isValidPageChange(10);
            expect(result).toBe(true);

            result = multiImage.isValidPageChange(1);
            expect(result).toBe(true);

            result = multiImage.isValidPageChange(5);
            expect(result).toBe(true);
        });
    });

    describe('scrollHandler()', () => {
        beforeEach(() => {
            stubs.requestAnimationFrame = jest.spyOn(window, 'requestAnimationFrame');
        });

        test('should do nothing if the scroll check handler already exists', () => {
            multiImage.scrollCheckHandler = true;

            multiImage.scrollHandler();
            expect(stubs.requestAnimationFrame).not.toBeCalled();
        });

        test('should reqeust an animation frame to handle page changes from scroll', () => {
            multiImage.scrollCheckHandler = undefined;

            multiImage.scrollHandler();
            expect(stubs.requestAnimationFrame).toBeCalledWith(multiImage.handlePageChangeFromScroll);
        });
    });

    describe('handlePageChangeFromScroll()', () => {
        beforeEach(() => {
            stubs.pageNumberFromScroll = jest.spyOn(util, 'pageNumberFromScroll').mockReturnValue(1);
            stubs.updateCurrentPage = jest.spyOn(multiImage, 'updateCurrentPage');
            multiImage.currentPageNumber = 1;
            multiImage.singleImageEls = [document.createElement('div')];
            stubs.singleImageEls = multiImage.singleImageEls;

            multiImage.wrapperEl = {
                scrollTop: 100,
            };
            stubs.wrapperEl = multiImage.wrapperEl;

            multiImage.previousScrollTop = 0;
        });

        test('should determine the current page number based on scroll', () => {
            multiImage.handlePageChangeFromScroll();
            expect(stubs.pageNumberFromScroll).toBeCalledWith(1, 0, stubs.singleImageEls[0], stubs.wrapperEl);
        });

        test('should attempt to update the current page number', () => {
            multiImage.handlePageChangeFromScroll();
            expect(stubs.updateCurrentPage).toBeCalled();
        });

        test('reset the scroll check handler and update the previous scroll top position', () => {
            multiImage.scrollCheckHandler = true;

            multiImage.handlePageChangeFromScroll();
            expect(multiImage.scrollCheckHandler).toBeNull();
            expect(multiImage.previousScrollTop).toBe(100);
        });
    });
});
