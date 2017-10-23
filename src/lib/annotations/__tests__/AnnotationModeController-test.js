import AnnotationModeController from '../AnnotationModeController';
import DocDrawingThread from '../doc/DocDrawingThread';
import * as util from '../annotatorUtil';

let controller;
let stubs;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/AnnotationModeController', () => {
    beforeEach(() => {
        controller = new AnnotationModeController();
        stubs = {};
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        stubs = null;
        controller = null;
    });

    describe('registerAnnotator()', () => {
        it('should internally keep track of the registered annotator', () => {
            const annotator = 'I am an annotator';
            expect(controller.annotator).to.be.undefined;

            controller.registerAnnotator(annotator);
            expect(controller.annotator).to.equal(annotator);
        });
    });

    describe('bindModeListeners()', () => {
        it('should bind mode listeners', () => {
            const handlerObj = {
                type: 'event',
                func: () => {},
                eventObj: {
                    addEventListener: sandbox.stub()
                }
            };
            sandbox.stub(controller, 'setupHandlers', () => {
                controller.handlers = [handlerObj];
            });
            expect(controller.handlers.length).to.equal(0);

            controller.bindModeListeners();
            expect(handlerObj.eventObj.addEventListener).to.be.calledWith(handlerObj.type, handlerObj.func);
            expect(controller.handlers.length).to.equal(1);
        });
    });

    describe('unbindModeListeners()', () => {
        it('should unbind mode listeners', () => {
            const handlerObj = {
                type: 'event',
                func: () => {},
                eventObj: {
                    removeEventListener: sandbox.stub()
                }
            };

            controller.handlers = [handlerObj];
            expect(controller.handlers.length).to.equal(1);

            controller.unbindModeListeners();
            expect(handlerObj.eventObj.removeEventListener).to.be.calledWith(handlerObj.type, handlerObj.func);
            expect(controller.handlers.length).to.equal(0);
        });
    });

    describe('registerThread()', () => {
        it('should internally keep track of the registered thread', () => {
            controller.threads = { 1: {} };
            const pageThreads = controller.threads[1];
            const thread = {
                threadID: '123abc',
                location: { page: 1 }
            };
            expect(thread.threadID in pageThreads).to.be.falsy;

            controller.registerThread(thread);
            expect(pageThreads[thread.threadID]).equals(thread);
        });
    });

    describe('unregisterThread()', () => {
        it('should internally keep track of the registered thread', () => {
            controller.threads = { 1: {} };
            const pageThreads = controller.threads[1];
            const thread = {
                threadID: '123abc',
                location: { page: 1 }
            };
            controller.registerThread(thread);
            expect(thread.threadID in pageThreads).to.be.truthy;

            controller.unregisterThread(thread);
            expect(thread.threadID in pageThreads).to.be.falsy;
        });
    });

    describe('bindCustomListenersOnThread()', () => {
        it('should do nothing when the input is empty', () => {
            controller.annotator = {
                bindCustomListenersOnThread: sandbox.stub()
            };

            controller.bindCustomListenersOnThread(undefined);
            expect(controller.annotator.bindCustomListenersOnThread).to.not.be.called;
        });

        it('should bind custom listeners on thread', () => {
            const thread = {
                addListener: sandbox.stub()
            };
            controller.annotator = {
                bindCustomListenersOnThread: sandbox.stub()
            };

            controller.bindCustomListenersOnThread(thread);
            expect(controller.annotator.bindCustomListenersOnThread).to.be.called;
            expect(thread.addListener).to.be.called;
        });

        // Catches edge case where sometimes the first click upon entering
        // Draw annotation mode, the annotator is not registered properly
        // with the controller
        it('should maintain annotator context when a "threadevent" is fired', () => {
            Object.defineProperty(DocDrawingThread.prototype, 'setup', { value: sandbox.stub() });
            Object.defineProperty(DocDrawingThread.prototype, 'getThreadEventData', { value: sandbox.stub() });
            const thread = new DocDrawingThread({ threadID: 123 });

            controller.handleAnnotationEvent = () => {
                expect(controller.annotator).to.not.be.undefined;
            };
            controller.annotator = {
                bindCustomListenersOnThread: sandbox.stub()
            };

            controller.bindCustomListenersOnThread(thread);
            thread.emit('threadevent', {});
        });
    });

    describe('unbindCustomListenersOnThread()', () => {
        it('should do nothing when the input is empty', () => {
            const thread = {
                removeAllListeners: sandbox.stub()
            };

            controller.unbindCustomListenersOnThread(undefined);
            expect(thread.removeAllListeners).to.not.be.called;
        });

        it('should bind custom listeners on thread', () => {
            const thread = {
                removeAllListeners: sandbox.stub()
            };

            controller.unbindCustomListenersOnThread(thread);
            expect(thread.removeAllListeners).to.be.calledWith('threadevent');
        });
    });

    describe('pushElementHandler()', () => {
        it('should do nothing when the element is invalid', () => {
            const lengthBefore = controller.handlers.length;

            controller.pushElementHandler(undefined, 'type', () => {});
            const lengthAfter = controller.handlers.length;
            expect(lengthAfter).to.equal(lengthBefore);
        });

        it('should add a handler descriptor to the handlers array', () => {
            const lengthBefore = controller.handlers.length;
            const element = 'element';
            const type = ['type1', 'type2'];
            const fn = 'fn';

            controller.pushElementHandler(element, type, fn);
            const handlers = controller.handlers;
            const lengthAfter = handlers.length;
            expect(lengthAfter).to.equal(lengthBefore+1);
            expect(handlers[handlers.length - 1]).to.deep.equal({
                eventObj: element,
                func: fn,
                type
            });
        });
    });

    describe('setupHeader()', () => {
        it('should insert the new header into the container before the baseheader', () => {
            stubs.insertTemplate = sandbox.stub(util, 'insertTemplate');
            const container = {
                firstElementChild: 'child'
            };
            const header = document.createElement('div');

            controller.setupHeader(container, header);

            expect(stubs.insertTemplate).to.be.calledWith(container, header);
        });
    });
});
