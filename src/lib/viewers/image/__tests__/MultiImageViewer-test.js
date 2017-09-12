/* eslint-disable no-unused-expressions */
import MultiImageViewer from '../MultiImageViewer';
import PageControls from '../../../PageControls';
import fullscreen from '../../../Fullscreen';
import BaseViewer from '../../BaseViewer';
import Browser from '../../../Browser';
import * as util from '../../../util';
import { ICON_FULLSCREEN_IN, ICON_FULLSCREEN_OUT } from '../../../icons/icons';

const CLASS_INVISIBLE = 'bp-is-invisible';

const sandbox = sinon.sandbox.create();
let multiImage;
let stubs = {};
let options;
let clock;
let containerEl;

describe('lib/viewers/image/MultiImageViewer', () => {
    stubs.errorHandler = MultiImageViewer.prototype.errorHandler;
    const setupFunc = BaseViewer.prototype.setup;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        clock = sinon.useFakeTimers();
        sandbox.stub(Browser, 'isMobile').returns(false);
        fixture.load('viewers/image/__tests__/MultiImageViewer-test.html');
        containerEl = document.querySelector('.container');
        stubs.emit = sandbox.stub(fullscreen, 'addListener');
        options = {
            file: {
                id: 100
            },
            viewerAsset: '{page}.png',
            viewer: {
                ASSET: '{page}.png'
            },
            container: containerEl,
            representation: {
                content: {
                    url_template: 'link'
                },
                metadata: {
                    pages: 3
                }
            }
        };

        stubs.singleImageEl = {
            src: undefined,
            setAttribute: sandbox.stub(),
            classList: {
                add: sandbox.stub()
            },
            scrollIntoView: sandbox.stub()
        };

        multiImage = new MultiImageViewer(options);

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.stub() });
        multiImage.containerEl = containerEl;
    });

    afterEach(() => {
        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (multiImage && multiImage.imagesEl) {
            multiImage.destroy();
        }

        stubs = {};

        sandbox.verifyAndRestore();
        fixture.cleanup();
        multiImage = null;
        clock.restore();
        clock = null;
        containerEl = null;
    });

    describe('destroy()', () => {
        beforeEach(() => {
            sandbox.stub(multiImage, 'getRepStatus').returns({ getPromise: sandbox.stub().returns(Promise.resolve()) });
            stubs.bindImageListeners = sandbox.stub(multiImage, 'bindImageListeners');
            stubs.setupImageEls = sandbox.stub(multiImage, 'setupImageEls');
            stubs.unbindDOMListeners = sandbox.stub(multiImage, 'unbindDOMListeners');
            multiImage.singleImageEls = [
                {
                    removeEventListener: sandbox.stub()
                }
            ];
        });

        it('should unbind the dom listeners', () => {
            multiImage.destroy();
            expect(stubs.unbindDOMListeners).to.be.called;
        });

        it('should remove all the image listeners', () => {
            stubs.unbindImageListeners = sandbox.stub(multiImage, 'unbindImageListeners');

            multiImage.destroy();
            expect(stubs.unbindImageListeners).to.be.called.thrice;
        });
    });

    describe('load()', () => {
        beforeEach(() => {
            sandbox.stub(multiImage, 'getRepStatus').returns({ getPromise: sandbox.stub().returns(Promise.resolve()) });
            stubs.constructImageUrls = sandbox.spy(multiImage, 'constructImageUrls');
            stubs.bindDOMListeners = sandbox.stub(multiImage, 'bindDOMListeners');
            stubs.bindImageListeners = sandbox.stub(multiImage, 'bindImageListeners');
            stubs.setupImageEls = sandbox.stub(multiImage, 'setupImageEls');
            multiImage.wrapperEl = {
                addEventListener: sandbox.stub()
            };
            stubs.addWrapperListener = multiImage.wrapperEl.addEventListener;
        });

        it('should create the image urls', () => {
            return multiImage
                .load('file/100/content/{page}.png')
                .then(() => {
                    expect(stubs.constructImageUrls).to.be.called;
                })
                .catch(() => {});
        });

        it('should add various listeners', () => {
            return multiImage
                .load('file/100/content/{page}.png')
                .then(() => {
                    expect(stubs.bindImageListeners).to.be.called;
                    expect(stubs.bindDOMListeners).to.be.called;
                    expect(stubs.constructImageUrls).to.be.called;
                    expect(stubs.addWrapperListener).to.be.calledWith('scroll', sinon.match.func, 'true');
                })
                .catch(() => {});
        });

        it('should make the images invisible', () => {
            return multiImage
                .load('file/100/content/{page}.png')
                .then(() => {
                    expect(multiImage.imageEl).to.have.class(CLASS_INVISIBLE);
                })
                .catch(() => {});
        });
    });

    describe('constructImageUrls()', () => {
        it('should remove both the new and old form of asset path', () => {
            const firstURL = 'file/100/content/1.png';
            const result = multiImage.constructImageUrls('file/100/content/{page}.png');

            expect(result[0]).to.equal(firstURL);

            multiImage.options = {
                viewerAsset: '{asset_path}',
                viewer: {
                    ASSET: '{page}.png'
                },
                representation: {
                    metadata: {
                        pages: 3
                    }
                }
            };
            const result2 = multiImage.constructImageUrls('file/100/content/{asset_path}');
            expect(result2[0]).to.equal(firstURL);
        });

        it('should create a URL for each page', () => {
            const result = multiImage.constructImageUrls('file/100/content/{page}.png');
            expect(result.length).to.equal(3);
        });
    });

    describe('setupImageEls()', () => {
        beforeEach(() => {
            multiImage.setup();
            stubs.bindImageListeners = sandbox.stub(multiImage, 'bindImageListeners');
        });

        it('should set the single image el and error handler if it is not the first image', () => {
            multiImage.singleImageEls = {
                1: stubs.singleImageEl
            };

            multiImage.setupImageEls('file/100/content/{page}.png', 1);
            expect(multiImage.singleImageEls[1].src).to.not.equal(undefined);
            expect(stubs.bindImageListeners).to.be.called;
        });

        it('should set the image source', () => {
            multiImage.singleImageEls = {
                0: stubs.singleImageEl
            };

            multiImage.setupImageEls('file/100/content/{page}.png', 0);
            expect(multiImage.singleImageEls[0].src).to.be.equal('file/100/content/{page}.png');
        });

        it('should set the page number for each image el', () => {
            multiImage.singleImageEls = {
                0: stubs.singleImageEl
            };

            multiImage.setupImageEls('file/100/content/{page}.png', 0);
            expect(stubs.singleImageEl.setAttribute).to.be.calledWith('data-page-number', 1);
        });

        it('should add the "page" class to all image pages', () => {
            multiImage.singleImageEls = {
                0: stubs.singleImageEl
            };

            multiImage.setupImageEls('file/100/content/{page}.png', 0);
            expect(stubs.singleImageEl.classList.add).to.be.calledWith('page');
        });
    });

    describe('updatePannability()', () => {
        beforeEach(() => {
            stubs.updateCursor = sandbox.stub(multiImage, 'updateCursor');
            multiImage.setup();
        });

        it('should do nothing if there is no wrapper', () => {
            multiImage.wrapperEl = null;
            multiImage.updatePannability();
            expect(stubs.updateCursor).to.not.be.called;
        });

        it('should become pannable if the page width exceeds the wrapper width', () => {
            multiImage.imageEl.style.width = '100px';
            multiImage.wrapperEl.style.width = '50px';

            multiImage.updatePannability();
            expect(multiImage.isPannable).to.be.true;
        });

        it('should become not pannable if the page width exceeds the wrapper width', () => {
            multiImage.imageEl.style.width = '10px';
            multiImage.wrapperEl.style.width = '50px';

            multiImage.updatePannability();
            expect(multiImage.isPannable).to.be.false;
        });

        it('should set did pan to false and update the cursor', () => {
            multiImage.updatePannability();
            expect(multiImage.didPan).to.be.false;
            expect(stubs.updateCursor).to.be.called;
        });
    });

    describe('zoom()', () => {
        beforeEach(() => {
            stubs.zoomEmit = sandbox.stub(multiImage, 'emit');
            stubs.setScale = sandbox.stub(multiImage, 'setScale');
            stubs.scroll = sandbox.stub(multiImage, 'setPage');
            stubs.updatePannability = sandbox.stub(multiImage, 'updatePannability');
            multiImage.setup();
        });

        it('should increase the width by 100px on zoom in', () => {
            multiImage.imageEl.parentNode.style.width = '100px';
            multiImage.zoom('in');
            expect(multiImage.imageEl.style.width).to.equal('200px');
        });

        it('should decrease the width by 100px on zoom out', () => {
            multiImage.imageEl.parentNode.style.width = '100px';
            multiImage.zoom('out');
            expect(multiImage.imageEl.style.width).to.equal('0px');
        });

        it('should reset the viewport width on default', () => {
            multiImage.imageEl.parentNode.style.width = '200px';
            multiImage.zoom('in');
            expect(multiImage.imageEl.parentNode.style.width).to.equal('200px');
        });

        it('should emit the zoom event, set a timeout to update pannability, and set the current scale', () => {
            multiImage.zoom();
            clock.tick(51);
            expect(stubs.zoomEmit).to.be.calledWith('zoom');
            expect(stubs.updatePannability).to.be.called;
            expect(stubs.setScale).to.be.calledWith(sinon.match.number, sinon.match.number);
        });
    });

    describe('setScale()', () => {
        it('should set the scale relative to the size of the first image dimensions', () => {
            multiImage.singleImageEls = [
                {
                    naturalWidth: 1024,
                    naturalHeight: 1024
                },
                {
                    src: 'www.NotTheRightImage.net'
                }
            ];
            sandbox.stub(multiImage, 'emit');

            multiImage.setScale(512, 512);
            expect(multiImage.emit).to.be.calledWith('scale', { scale: 0.5 });
        });
    });


    describe('loadUI()', () => {
        it('should create page controls and bind the page control listeners', () => {
            stubs.bindPageControlListeners = sandbox.stub(multiImage, 'bindPageControlListeners')

            multiImage.loadUI();
            expect(multiImage.pageControls instanceof PageControls).to.be.true;
            expect(multiImage.pageControls.contentEl).to.equal(multiImage.wrapperEl);
            expect(stubs.bindPageControlListeners).to.be.called;
        });
    });

    describe('bindPageControlListeners', () => {
        beforeEach(() => {
            multiImage.currentPageNumber = 1;
            multiImage.pagesCount = 10;
            multiImage.pageControls = {
                add: sandbox.stub(),
                addListener: sandbox.stub()
            }

            multiImage.controls = {
                add: sandbox.stub()
            }
        });

        it('should add the page controls and bind the pagechange listener', () => {
            multiImage.bindPageControlListeners();

            expect(multiImage.pageControls.add).to.be.calledWith(multiImage.currentPageNumber, multiImage.pagesCount);
            expect(multiImage.pageControls.addListener).to.be.calledWith('pagechange', multiImage.setPage);
        });

        it('should finish binding the document controls', () => {
            multiImage.bindPageControlListeners();

            expect(multiImage.controls.add).to.be.calledWith(__('enter_fullscreen'), multiImage.toggleFullscreen, 'bp-enter-fullscreen-icon', ICON_FULLSCREEN_IN);
            expect(multiImage.controls.add).to.be.calledWith(__('exit_fullscreen'), multiImage.toggleFullscreen, 'bp-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
        });

    });


    describe('bindImageListeners', () => {
        beforeEach(() => {
            multiImage.singleImageEls = {
                0: {
                    addEventListener: sandbox.stub()
                },
                1: {
                    addEventListener: sandbox.stub()
                }
            };
        });

        it('should add the load event listener to the first image', () => {
            multiImage.bindImageListeners(0);
            expect(multiImage.singleImageEls[0].addEventListener).to.be.calledWith('load', sinon.match.func);
        });

        it('should add the error event listener', () => {
            multiImage.bindImageListeners(1);
            expect(multiImage.singleImageEls[1].addEventListener).to.be.calledWith('error', sinon.match.func);
        });
    });

    describe('unbindImageListeners', () => {
        beforeEach(() => {
            multiImage.singleImageEls = {
                0: {
                    removeEventListener: sandbox.stub()
                },
                1: {
                    removeEventListener: sandbox.stub()
                }
            };
        });

        it('should remove the load event listener from the first image', () => {
            multiImage.unbindImageListeners(0);
            expect(multiImage.singleImageEls[0].removeEventListener).to.be.calledWith('load', sinon.match.func);
        });

        it('should remove the error event listener', () => {
            multiImage.unbindImageListeners(1);
            expect(multiImage.singleImageEls[1].removeEventListener).to.be.calledWith('error', sinon.match.func);
        });
    });

    describe('setPage()', () => {
        beforeEach(() => {
            multiImage.singleImageEls = {
                1: stubs.singleImageEl,
                2: stubs.singleImageEl,
                3: stubs.singleImageEl
            };
            sandbox.stub(multiImage, 'emit');
            stubs.isValidPageChange = sandbox.stub(multiImage, 'isValidPageChange');
            stubs.updateCurrentPage = sandbox.stub(multiImage, 'updateCurrentPage')
        })

        it('should do nothing if the page change is invalid', () => {
            multiImage.setPage(-2);
            expect(multiImage.singleImageEls[2].scrollIntoView).to.not.be.called;
        });

        it('should scroll the set page into view', () => {
            stubs.isValidPageChange.returns(true);

            multiImage.setPage(2);
            expect(stubs.singleImageEl.scrollIntoView).to.be.called;
        });

        it('should update the current page number', () => {
            stubs.isValidPageChange.returns(true);

            multiImage.setPage(2);
            expect(stubs.updateCurrentPage).to.be.calledWith(2);
        });
    });

    describe('updateCurrentPage()', () => {
        beforeEach(() => {
            stubs.isValidPageChange = sandbox.stub(multiImage, 'isValidPageChange');
            multiImage.pageControls = {
                updateCurrentPage: sandbox.stub()
            }

            stubs.emit = sandbox.stub(multiImage, 'emit');
            multiImage.currentPageNumber = 1
        });

        it('should do nothing if the requested page change is invalid', () => {
            stubs.isValidPageChange.returns(false);

            multiImage.updateCurrentPage(3);
            expect(multiImage.currentPageNumber).to.equal(1);
        });

        it('should set the current page number and update the page controls', () => {
            stubs.isValidPageChange.returns(true);

            multiImage.updateCurrentPage(3);
            expect(multiImage.currentPageNumber).to.equal(3);
            expect(multiImage.pageControls.updateCurrentPage).to.be.calledWith(3);
        });

        it('should emit the pagefocus event', () => {
            stubs.isValidPageChange.returns(true);

            multiImage.updateCurrentPage(3);
            expect(stubs.emit).to.be.calledWith('pagefocus', { pageNumber: 3 });
        });
    });

    describe('isValidPageChange()', () => {
        beforeEach(() => {
            multiImage.pagesCount = 10;
            multiImage.currentPageNumber = 3;
        });

        it('should return false if the page number is less thatn one', () => {
            const result = multiImage.isValidPageChange(0);
            expect(result).to.be.false;
        });

        it('should return false if the page number is greater than the number of pages', () => {
            const result = multiImage.isValidPageChange(11);
            expect(result).to.be.false;
        });

        it('should return false if the page number is the same as the current page number', () => {
            let result = multiImage.isValidPageChange(3);
            expect(result).to.be.false;
        });

        it('should return true if the page number is in the range of valid pages', () => {
            let result = multiImage.isValidPageChange(10);
            expect(result).to.be.true;

            result = multiImage.isValidPageChange(1);
            expect(result).to.be.true;

            result = multiImage.isValidPageChange(5);
            expect(result).to.be.true;
        });
    });

    describe('scrollHandler()', () => {
        beforeEach(() => {
            stubs.requestAnimationFrame = sandbox.stub(window, 'requestAnimationFrame');
        })

        it('should do nothing if the scroll check handler already exists', () => {
            multiImage.scrollCheckHandler = true;

            multiImage.scrollHandler();
            expect(stubs.requestAnimationFrame).to.not.be.called;
        });

        it('should reqeust an animation frame to handle page changes from scroll', () => {
            multiImage.scrollCheckHandler = undefined;

            multiImage.scrollHandler();
            expect(stubs.requestAnimationFrame).to.be.calledWith(multiImage.handlePageChangeFromScroll);
        });
    });

    describe('handlePageChangeFromScroll()', () => {
        beforeEach(() => {
            stubs.pageNumberFromScroll = sandbox.stub(util, 'pageNumberFromScroll').returns(1);
            stubs.updateCurrentPage = sandbox.stub(multiImage, 'updateCurrentPage');
            multiImage.currentPageNumber = 1;
            multiImage.singleImageEls = [document.createElement('div')];
            stubs.singleImageEls = multiImage.singleImageEls;

            multiImage.wrapperEl = {
                scrollTop: 100
            }
            stubs.wrapperEl = multiImage.wrapperEl;

            multiImage.previousScrollTop = 0;

        })

        it('should determine the current page number based on scroll', () => {
            multiImage.handlePageChangeFromScroll();
            expect(stubs.pageNumberFromScroll).to.be.calledWith(1, 0, stubs.singleImageEls[0], stubs.wrapperEl);
        });

        it('should attempt to update the current page number', () => {
            multiImage.handlePageChangeFromScroll();
            expect(stubs.updateCurrentPage).to.be.called;
        });

        it('reset the scroll check handler and update the previous scroll top position', () => {
            multiImage.scrollCheckHandler = true;

            multiImage.handlePageChangeFromScroll();
            expect(multiImage.scrollCheckHandler).to.equal(null);
            expect(multiImage.previousScrollTop).to.equal(100);
        });
    });
});
