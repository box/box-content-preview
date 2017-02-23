/* eslint-disable no-unused-expressions */
import MultiImage from '../multi-image';
import fullscreen from '../../../fullscreen';
import Browser from '../../../browser';

const CLASS_INVISIBLE = 'bp-is-invisible';

const sandbox = sinon.sandbox.create();
let multiImage;
let stubs = {};
let options;
let clock;


describe('multi-image.js', () => {
    stubs.errorHandler = MultiImage.prototype.errorHandler;
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        clock = sinon.useFakeTimers();
        sandbox.stub(Browser, 'isMobile').returns(false);
        fixture.load('viewers/image/__tests__/multi-image-test.html');
        stubs.emit = sandbox.stub(fullscreen, 'addListener');
        options = {
            file: {
                id: 100
            },
            viewerAsset: '{page}.png',
            viewer: {
                ASSET: '{page}.png'
            },
            container: '.bp-container',
            representation: {
                content: {
                    url_template: 'link'
                },
                metadata: {
                    pages: 3
                }
            }
        };

        multiImage = new MultiImage(options);
    });

    afterEach(() => {
        if (multiImage && multiImage.imagesEl) {
            multiImage.destroy();
        }

        stubs = {};

        sandbox.verifyAndRestore();
        fixture.cleanup();
        multiImage = null;
        clock.restore();
        clock = null;
    });

    describe('destroy()', () => {
        beforeEach(() => {
            sandbox.stub(multiImage, 'getRepStatus').returns({ getPromise: sandbox.stub().returns(Promise.resolve()) });
            stubs.bindImageListeners = sandbox.stub(multiImage, 'bindImageListeners');
            stubs.setupImageEls = sandbox.stub(multiImage, 'setupImageEls');
            stubs.unbindDOMListeners = sandbox.stub(multiImage, 'unbindDOMListeners');
            multiImage.singleImageEls = [{
                removeEventListener: sandbox.stub()
            }];
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
        });

        it('should create the image urls', () => {
            return multiImage.load('file/100/content/{page}.png').then(() => {
                expect(stubs.constructImageUrls).to.be.called;
            }).catch(() => {});
        });

        it('should add various listeners', () => {
            return multiImage.load('file/100/content/{page}.png').then(() => {
                expect(stubs.bindImageListeners).to.be.called;
                expect(stubs.bindDOMListeners).to.be.called;
                expect(stubs.constructImageUrls).to.be.called;
            }).catch(() => {});
        });

        it('should make the images invisible', () => {
            return multiImage.load('file/100/content/{page}.png').then(() => {
                expect(multiImage.imageEl).to.have.class(CLASS_INVISIBLE);
            }).catch(() => {});
        });
    });

    describe('setupImageEls()', () => {
        beforeEach(() => {
            multiImage.setup();
            stubs.bindImageListeners = sandbox.stub(multiImage, 'bindImageListeners');
            stubs.singleImageEl = {
                src: undefined
            };
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

        it('should emit the zoom event, and set a timeout to update pannability ', () => {
            multiImage.zoom();
            clock.tick(51);
            expect(stubs.zoomEmit).to.be.called;
            expect(stubs.updatePannability).to.be.called;
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
});
