import AnnotationModeController from '../AnnotationModeController';

let annotationModeController;
let stubs;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/AnnotationModeController', () => {
    beforeEach(() => {
        annotationModeController = new AnnotationModeController();
        stubs = {};
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        stubs = null;
        annotationModeController = null;
    });

    describe('registerAnnotator()', () => {
        it('should internally keep track of the registered annotator', () => {
            const annotator = 'I am an annotator';
            expect(annotationModeController.annotator).to.be.undefined;

            annotationModeController.registerAnnotator(annotator);
            expect(annotationModeController.annotator).to.equal(annotator);
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
            sandbox.stub(annotationModeController, 'setupAndGetHandlers').returns([handlerObj]);
            expect(annotationModeController.handlers.length).to.equal(0);

            annotationModeController.bindModeListeners();
            expect(handlerObj.eventObj.addEventListener).to.be.calledWith(handlerObj.type, handlerObj.func);
            expect(annotationModeController.handlers.length).to.equal(1);
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

            annotationModeController.handlers = [handlerObj];
            expect(annotationModeController.handlers.length).to.equal(1);

            annotationModeController.unbindModeListeners();
            expect(handlerObj.eventObj.removeEventListener).to.be.calledWith(handlerObj.type, handlerObj.func);
            expect(annotationModeController.handlers.length).to.equal(0);
        });
    });

    describe('registerThread()', () => {
        it('should internally keep track of the registered thread', () => {
            const thread = 'I am a thread';
            expect(annotationModeController.threads.includes(thread)).to.be.falsy;

            annotationModeController.registerThread(thread);
            expect(annotationModeController.threads.includes(thread)).to.be.truthy;
        });
    });

    describe('unregisterThread()', () => {
        it('should internally keep track of the registered thread', () => {
            const thread = 'I am a thread';
            annotationModeController.threads = [thread, 'other'];
            expect(annotationModeController.threads.includes(thread)).to.be.truthy;

            annotationModeController.unregisterThread(thread);
            expect(annotationModeController.threads.includes(thread)).to.be.falsy;
        });
    });

    describe('bindCustomListenersOnThread()', () => {
        it('should do nothing when the input is empty', () => {
            annotationModeController.annotator = {
                bindCustomListenersOnThread: sandbox.stub()
            };

            annotationModeController.bindCustomListenersOnThread(undefined);
            expect(annotationModeController.annotator.bindCustomListenersOnThread).to.not.be.called;
        });

        it('should bind custom listeners on thread', () => {
            const thread = {
                addListener: sandbox.stub()
            };
            annotationModeController.annotator = {
                bindCustomListenersOnThread: sandbox.stub()
            };

            annotationModeController.bindCustomListenersOnThread(thread);
            expect(annotationModeController.annotator.bindCustomListenersOnThread).to.be.called;
            expect(thread.addListener).to.be.called;
        });
    });

    describe('unbindCustomListenersOnThread()', () => {
        it('should do nothing when the input is empty', () => {
            const thread = {
                removeAllListeners: sandbox.stub()
            };

            annotationModeController.unbindCustomListenersOnThread(undefined);
            expect(thread.removeAllListeners).to.not.be.called;
        });

        it('should bind custom listeners on thread', () => {
            const thread = {
                removeAllListeners: sandbox.stub()
            };

            annotationModeController.unbindCustomListenersOnThread(thread);
            expect(thread.removeAllListeners).to.have.callCount(4);
        });
    });
});
