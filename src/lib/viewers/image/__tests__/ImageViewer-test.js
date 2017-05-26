/* eslint-disable no-unused-expressions */
import ImageViewer from '../ImageViewer';
import BaseViewer from '../../BaseViewer';
import Browser from '../../../Browser';
import * as util from '../../../util';

const CSS_CLASS_ZOOMABLE = 'zoomable';
const CSS_CLASS_PANNABLE = 'pannable';

const sandbox = sinon.sandbox.create();
const imageUrl =
    'data:image/png;base64,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';
let image;
let stubs = {};
let containerEl;
let clock;

describe('lib/viewers/image/ImageViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        clock = sinon.useFakeTimers();
        fixture.load('viewers/image/__tests__/ImageViewer-test.html');
        containerEl = document.querySelector('.container');
        image = new ImageViewer({
            container: containerEl,
            file: {
                id: '1',
                file_version: {
                    id: '1'
                },
                permissions: {
                    can_annotate: true
                }
            },
            viewer: {
                NAME: 'Image',
                ASSET: '1.png'
            },
            representation: {
                content: {
                    url_template: 'foo'
                }
            }
        });

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.stub() });
        image.containerEl = containerEl;
        image.setup();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();
        clock.restore();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (image && typeof image.destroy === 'function') {
            image.destroy();
        }
        image = null;
        stubs = {};
    });

    describe('setup()', () => {
        it('should set up layout and init annotations', () => {
            expect(image.wrapperEl).to.have.class('bp-image');
            expect(image.imageEl).to.have.class('bp-is-invisible');
        });
    });

    describe('load()', () => {
        it('should fetch the image URL and load an image', () => {
            sandbox.stub(image, 'createContentUrlWithAuthParams').returns(imageUrl);
            sandbox.stub(image, 'getRepStatus').returns({ getPromise: () => Promise.resolve() });
            stubs.event = sandbox.stub(image.imageEl, 'addEventListener');
            stubs.load = sandbox.stub(image, 'finishLoading');
            stubs.error = sandbox.stub(image, 'errorHandler');
            stubs.bind = sandbox.stub(image, 'bindDOMListeners');

            // load the image
            return image
                .load(imageUrl)
                .then(() => {
                    expect(image.bindDOMListeners).to.be.called;
                    expect(image.createContentUrlWithAuthParams).to.be.calledWith('foo', '1.png');
                })
                .catch(() => {});
        });
    });

    describe('prefetch()', () => {
        it('should prefetch content if content is true and representation is ready', () => {
            sandbox.stub(image, 'isRepresentationReady').returns(true);
            sandbox.stub(image, 'createContentUrlWithAuthParams').returns('somecontenturl');
            image.prefetch({ content: true });
            expect(image.createContentUrlWithAuthParams).to.be.calledWith('foo', '1.png');
        });

        it('should not prefetch content if content is true but representation is not ready', () => {
            sandbox.stub(image, 'isRepresentationReady').returns(false);
            sandbox.stub(image, 'createContentUrlWithAuthParams');
            image.prefetch({ content: true });
            expect(image.createContentUrlWithAuthParams).to.not.be.called;
        });

        it('should not prefetch content if file is watermarked', () => {
            image.options.file.watermark_info = {
                is_watermarked: true
            };
            sandbox.stub(image, 'createContentUrlWithAuthParams');

            image.prefetch({ content: true });

            expect(image.createContentUrlWithAuthParams).to.not.be.called;
        });
    });

    describe('updatePannability()', () => {
        beforeEach(() => {
            stubs.cursor = sandbox.stub(image, 'updateCursor');
            image.didPan = true;
        });

        it('should ignore if image does not exist', () => {
            stubs.imageEl = image.imageEl;
            image.imageEl = null;

            image.updatePannability();

            expect(image.didPan).to.have.been.true;
            expect(stubs.cursor).to.not.be.called;

            image.imageEl = stubs.imageEl;
        });

        it('should ignore if in point annotation mode', () => {
            image.annotator = {
                isInPointMode: sandbox.stub().returns(true)
            };

            image.updatePannability();

            expect(image.annotator.isInPointMode).to.be.called;
            expect(image.didPan).to.have.been.true;
            expect(stubs.cursor).to.not.be.called;
        });

        it('should set pannability to true if rotated image is pannable', () => {
            image.annotator = {
                isInPointMode: sandbox.stub().returns(false)
            };
            sandbox.stub(image, 'isRotated').returns(true);

            image.imageEl.style.height = '50px';
            image.imageEl.style.width = '10px';
            image.wrapperEl.style.height = '10px';
            image.wrapperEl.style.width = '50px';

            image.updatePannability();
            expect(image.annotator.isInPointMode).to.be.called;
            expect(image.didPan).to.have.been.false;
            expect(stubs.cursor).to.be.called;
        });

        it('should set pannability to false if rotated image is not pannable', () => {
            image.annotator = {
                isInPointMode: sandbox.stub().returns(false)
            };
            sandbox.stub(image, 'isRotated').returns(true);

            image.imageEl.style.height = '10px';
            image.wrapperEl.style.height = '50px';
            image.imageEl.style.width = '10px';
            image.wrapperEl.style.width = '50px';

            image.updatePannability();

            expect(image.annotator.isInPointMode).to.be.called;
            expect(image.didPan).to.have.been.false;
            expect(stubs.cursor).to.be.called;
        });

        it('should set pannability to true if non-rotated image is pannable', () => {
            image.annotator = {
                isInPointMode: sandbox.stub().returns(false)
            };
            sandbox.stub(image, 'isRotated').returns(false);

            image.imageEl.style.height = '50px';
            image.wrapperEl.style.height = '10px';
            image.imageEl.style.width = '50px';
            image.wrapperEl.style.width = '10px';

            image.updatePannability();

            expect(image.annotator.isInPointMode).to.be.called;
            expect(image.didPan).to.have.been.false;
            expect(stubs.cursor).to.be.called;
        });

        it('should set pannability to false if non-rotated image is not pannable', () => {
            image.annotator = {
                isInPointMode: sandbox.stub().returns(false)
            };
            sandbox.stub(image, 'isRotated').returns(false);

            image.imageEl.style.height = '10px';
            image.wrapperEl.style.height = '50px';
            image.imageEl.style.width = '10px';
            image.wrapperEl.style.width = '50px';

            image.updatePannability();

            expect(image.annotator.isInPointMode).to.be.called;
            expect(image.didPan).to.have.been.false;
            expect(stubs.cursor).to.be.called;
        });
    });

    describe('rotateLeft()', () => {
        beforeEach(() => {
            stubs.emit = sandbox.stub(image, 'emit');
            stubs.orientChange = sandbox.stub(image, 'handleOrientationChange');
            image.annotator = {};
            stubs.scale = sandbox.stub(image, 'setScale');
            image.currentRotationAngle = 0;
        });

        it('should rotate the image 90 degrees to the left', () => {
            image.rotateLeft();

            expect(image.currentRotationAngle).to.equal(-90);
            expect(image.imageEl.getAttribute('data-rotation-angle')).to.equal('-90');
            expect(image.imageEl.style.transform).to.equal('rotate(-90deg)');
            expect(stubs.emit).to.be.calledWith('rotate');
            expect(stubs.orientChange).to.be.called;
        });

        it('should re-render annotations if annotator is initialized', () => {
            image.rotateLeft();

            expect(stubs.scale).to.be.called;
        });
    });

    describe('zoom()', () => {
        beforeEach(() => {
            sandbox.stub(image, 'appendAuthParams').returns(imageUrl);
            sandbox.stub(image, 'finishLoading');

            // Stub out methods called in zoom()
            stubs.adjustZoom = sandbox.stub(image, 'adjustImageZoomPadding');

            // Set image height & width
            image.imageEl.style.width = '100px';
            image.imageEl.style.height = '100px';
            image.wrapperEl.style.width = '50px';
            image.wrapperEl.style.height = '50px';

            sandbox.stub(image, 'getRepStatus').returns({ getPromise: () => Promise.resolve() });
            image.load(imageUrl).catch(() => {});
        });

        describe('should zoom in by modifying', () => {
            it('width', () => {
                image.imageEl.style.width = '200px';

                const origImageSize = image.imageEl.getBoundingClientRect();
                image.zoom('in');
                const newImageSize = image.imageEl.getBoundingClientRect();
                expect(newImageSize.width).gt(origImageSize.width);
            });

            it('height', () => {
                image.imageEl.style.height = '200px';

                const origImageSize = image.imageEl.getBoundingClientRect();
                image.zoomIn();
                const newImageSize = image.imageEl.getBoundingClientRect();
                expect(newImageSize.height).gt(origImageSize.height);
                expect(stubs.adjustZoom).to.be.called;
            });
        });

        describe('should zoom out by modifying', () => {
            it('width', () => {
                image.imageEl.style.width = '200px';

                const origImageSize = image.imageEl.getBoundingClientRect();
                image.zoomOut();
                const newImageSize = image.imageEl.getBoundingClientRect();
                expect(newImageSize.width).lt(origImageSize.width);
                expect(stubs.adjustZoom).to.be.called;
            });

            it('height', () => {
                image.imageEl.style.height = '200px';

                const origImageSize = image.imageEl.getBoundingClientRect();
                image.zoomOut();
                const newImageSize = image.imageEl.getBoundingClientRect();
                expect(newImageSize.height).lt(origImageSize.height);
                expect(stubs.adjustZoom).to.be.called;
            });
        });

        it('should swap height & width when image is rotated', () => {
            sandbox.stub(image, 'isRotated').returns(true);

            image.load(imageUrl).catch(() => {});
            image.imageEl.style.width = '200px'; // ensures width > height

            const origImageSize = image.imageEl.getBoundingClientRect();
            image.zoomIn();
            const newImageSize = image.imageEl.getBoundingClientRect();

            expect(newImageSize.height).gt(origImageSize.height);
            expect(stubs.adjustZoom).to.be.called;
        });

        it('should scale annotations if annotator exists', () => {
            image.annotator = {};
            sandbox.stub(image, 'setScale');

            image.load(imageUrl).catch(() => {});

            image.zoomIn();
            expect(image.setScale).to.be.called;
        });

        it('should reset dimensions and adjust padding when called with reset', () => {
            image.imageEl.style.width = '10px';
            image.imageEl.style.height = '20px';
            sandbox.spy(image, 'zoom');

            image.zoom('reset');

            expect(image.imageEl.style.width).to.equal('');
            expect(image.imageEl.style.height).to.equal('');
            expect(stubs.adjustZoom).to.be.called;
            expect(image.zoom).to.be.calledWith();
        });
    });

    describe('setScale()', () => {
        it('should scale and rotate annotations accordingly', () => {
            sandbox.stub(image, 'emit');
            image.currentRotationAngle = -90;
            const [width, height] = [100, 100];

            image.setScale(width, height);
            expect(image.emit).to.be.calledWith('scale', sinon.match.any, sinon.match.number);
        });
    });

    describe('loadUI()', () => {
        beforeEach(() => {
            image.boxAnnotationsLoaded = false;
        });

        it('should load UI & controls for zoom', () => {
            image.annotator = null;

            image.loadUI();

            expect(image.controls).to.not.be.undefined;
            expect(image.controls.buttonRefs.length).to.equal(5);
            expect(image.boxAnnotationsLoaded).to.be.false;
        });

        it('should disable controls if on a mobile browser', () => {
            image.isMobile = true;
            image.loadUI();
            expect(image.controls).to.be.undefined;
        });
    });

    describe('print()', () => {
        beforeEach(() => {
            stubs.mockIframe = util.openContentInsideIframe(image.imageEl.outerHTML);
            stubs.focus = sandbox.stub(stubs.mockIframe.contentWindow, 'focus');
            stubs.execCommand = sandbox.stub(stubs.mockIframe.contentWindow.document, 'execCommand');
            stubs.print = sandbox.stub(stubs.mockIframe.contentWindow, 'print');

            stubs.openContentInsideIframe = sandbox.stub(util, 'openContentInsideIframe').returns(stubs.mockIframe);
            stubs.getName = sandbox.stub(Browser, 'getName');
        });

        it('should open the content inside an iframe, center, and focus', () => {
            image.print();
            expect(stubs.openContentInsideIframe).to.be.called;
            expect(image.printImage.style.display).to.equal('block');
            expect(image.printImage.style.margin).to.equal('0px auto');
            expect(stubs.focus).to.be.called;
        });

        it('should execute the print command if the browser is Explorer', () => {
            stubs.getName.returns('Explorer');

            image.print();
            expect(stubs.execCommand).to.be.calledWith('print', false, null);
        });

        it('should execute the print command if the browser is Edge', () => {
            stubs.getName.returns('Edge');

            image.print();
            expect(stubs.execCommand).to.be.calledWith('print', false, null);
        });

        it('should call the contentWindow print for other browsers', () => {
            stubs.getName.returns('Chrome');

            image.print();
            expect(stubs.print).to.be.called;
        });
    });

    describe('isRotated()', () => {
        it('should return false if image is not rotated', () => {
            const result = image.isRotated();
            expect(result).to.be.false;
        });

        it('should return true if image is rotated', () => {
            image.currentRotationAngle = 90;
            const result = image.isRotated();
            expect(result).to.be.true;
        });
    });

    describe('adjustImageZoomPadding()', () => {
        beforeEach(() => {
            // Set wrapper dimensions
            image.wrapperEl.style.height = '200px';
            image.wrapperEl.style.width = '100px';

            // Set image dimensions
            image.imageEl.style.height = '50px';
            image.imageEl.style.width = '25px';
        });

        it('should adjust zoom padding accordingly if image is rotated', () => {
            stubs.rotated = sandbox.stub(image, 'isRotated').returns(true);
            image.adjustImageZoomPadding();
            expect(stubs.rotated).to.be.called;
            expect(image.imageEl.style.left).to.equal('37.5px');
            expect(image.imageEl.style.top).to.equal('75px');
        });

        it('should adjust zoom padding accordingly if image is not rotated', () => {
            image.adjustImageZoomPadding();
            expect(image.imageEl.style.left).to.equal('37.5px');
            expect(image.imageEl.style.top).to.equal('75px');
        });
    });

    describe('bindDOMListeners()', () => {
        beforeEach(() => {
            image.isMobile = true;
            image.imageEl.addEventListener = sandbox.stub();
            stubs.listeners = image.imageEl.addEventListener;
        });

        it('should bind all mobile listeners', () => {
            sandbox.stub(Browser, 'isIOS').returns(true);
            image.bindDOMListeners();
            expect(stubs.listeners).to.have.been.calledWith('orientationchange', image.handleOrientationChange);
        });
    });

    describe('unbindDOMListeners()', () => {
        beforeEach(() => {
            stubs.removeEventListener = sandbox.stub(document, 'removeEventListener');
            image.imageEl.removeEventListener = sandbox.stub();
            image.isMobile = true;
            stubs.listeners = image.imageEl.removeEventListener;
        });

        it('should unbind all default image listeners', () => {
            image.unbindDOMListeners();
            expect(stubs.listeners).to.have.been.calledWith('load', image.finishLoading);
            expect(stubs.listeners).to.have.been.calledWith('error', image.errorHandler);
        });

        it('should unbind all mobile listeners', () => {
            sandbox.stub(Browser, 'isIOS').returns(true);
            image.unbindDOMListeners();
            expect(stubs.listeners).to.have.been.calledWith('orientationchange', image.handleOrientationChange);
        });
    });

    describe('handleMouseUp()', () => {
        beforeEach(() => {
            stubs.pan = sandbox.stub(image, 'stopPanning');
            image.annotator = {
                isInPointMode: sandbox.stub().returns(false)
            };
            stubs.point = image.annotator.isInPointMode;
            stubs.zoom = sandbox.stub(image, 'zoom');
            image.isPanning = false;
        });

        it('should do nothing if in point annotation mode', () => {
            stubs.point.returns(true);
            image.handleMouseUp();
            expect(stubs.zoom).to.not.be.called;
        });

        it('should do nothing if incorrect click type', () => {
            const event = {
                button: 3,
                ctrlKey: null,
                metaKey: null,
                clientX: 1,
                clientY: 1,
                preventDefault: sandbox.stub()
            };
            image.handleMouseUp(event);
            event.button = 1;
            event.ctrlKey = 'blah';
            image.handleMouseUp(event);
            event.ctrlKey = null;
            event.metaKey = 'blah';
            image.handleMouseUp(event);
            expect(stubs.zoom).to.not.be.called;
        });

        it('should zoom in if zoomable but not pannable', () => {
            const event = {
                button: 1,
                ctrlKey: null,
                metaKey: null,
                clientX: 1,
                clientY: 1,
                preventDefault: sandbox.stub()
            };
            image.isZoomable = true;
            image.handleMouseUp(event);
            expect(stubs.zoom).to.be.calledWith('in');
        });

        it('should reset zoom if mouseup was not due to end of panning', () => {
            const event = {
                button: 1,
                ctrlKey: null,
                metaKey: null,
                clientX: 1,
                clientY: 1,
                preventDefault: sandbox.stub()
            };
            image.isZoomable = false;
            image.didPan = false;
            image.handleMouseUp(event);
            expect(stubs.zoom).to.be.calledWith('reset');
        });

        it('should not zoom if mouse up was due to end of panning', () => {
            const event = {
                button: 1,
                ctrlKey: null,
                metaKey: null,
                clientX: 1,
                clientY: 1,
                preventDefault: sandbox.stub()
            };
            image.isZoomable = false;
            image.didPan = true;
            image.handleMouseUp(event);
            expect(stubs.zoom).to.not.be.called;
        });
    });

    describe('handleOrientationChange()', () => {
        it('should adjust zoom padding and set scale', () => {
            stubs.padding = sandbox.stub(image, 'adjustImageZoomPadding');
            sandbox.stub(image, 'emit');
            image.handleOrientationChange();
            expect(stubs.padding).to.be.called;
            expect(image.emit).to.be.calledWith('scale', sinon.match.any, sinon.match.number);
        });
    });

    describe('getPointModeClickHandler()', () => {
        it('should do nothing if not annotatable', () => {
            sandbox.stub(image, 'isAnnotatable').returns(false);
            const handler = image.getPointModeClickHandler();
            expect(handler).to.be.null;
        });

        it('should return event listener', () => {
            const event = {};
            image.annotator = {
                togglePointModeHandler: () => {}
            };
            sandbox.stub(image, 'emit');
            image.imageEl.classList.add(CSS_CLASS_ZOOMABLE);
            image.imageEl.classList.add(CSS_CLASS_PANNABLE);
            sandbox.stub(image, 'isAnnotatable').returns(true);

            const handler = image.getPointModeClickHandler();
            expect(handler).to.be.a('function');

            handler(event);
            expect(image.imageEl).to.not.have.class(CSS_CLASS_ZOOMABLE);
            expect(image.imageEl).to.not.have.class(CSS_CLASS_PANNABLE);
            expect(image.emit).to.have.been.calledWith('togglepointannotationmode');
        });
    });
});
