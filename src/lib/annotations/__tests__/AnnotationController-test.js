import AnnotationController from '../AnnotationController';

let annotationController;
let stubs;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/AnnotationController', () => {
    beforeEach(() => {
        annotationController = new AnnotationController();
        stubs = {};
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        stubs = null;
        annotationController = null;
    });

    describe('registerAnnotator()', () => {
        it('should internally keep track of the registered annotator', () => {
            const annotator = 'I am an annotator';
            expect(annotationController.annotator).to.be.undefined;

            annotationController.registerAnnotator(annotator);
            expect(annotationController.annotator).to.equal(annotator);
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
            sandbox.stub(annotationController, 'setupAndGetHandlers').returns([handlerObj]);
            expect(annotationController.handlers.length).to.equal(0);

            annotationController.bindModeListeners();
            expect(handlerObj.eventObj.addEventListener).to.be.calledWith(handlerObj.type, handlerObj.func);
            expect(annotationController.handlers.length).to.equal(1);
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

            annotationController.handlers = [handlerObj];
            expect(annotationController.handlers.length).to.equal(1);

            annotationController.unbindModeListeners();
            expect(handlerObj.eventObj.removeEventListener).to.be.calledWith(handlerObj.type, handlerObj.func);
            expect(annotationController.handlers.length).to.equal(0);
        });
    });

    describe('registerThread()', () => {
        it('should internally keep track of the registered thread', () => {
            const thread = 'I am a thread';
            expect(annotationController.threads.includes(thread)).to.be.falsy;

            annotationController.registerThread(thread);
            expect(annotationController.threads.includes(thread)).to.be.truthy;
        });
    });

    describe('unregisterThread()', () => {
        it('should internally keep track of the registered thread', () => {
            const thread = 'I am a thread';
            annotationController.threads = [thread, 'other'];
            expect(annotationController.threads.includes(thread)).to.be.truthy;

            annotationController.unregisterThread(thread);
            expect(annotationController.threads.includes(thread)).to.be.falsy;
        });
    });

    describe('bindCustomListenersOnThread()', () => {
        it('should do nothing when the input is empty', () => {
            annotationController.annotator = {
                bindCustomListenersOnThread: sandbox.stub()
            };

            annotationController.bindCustomListenersOnThread(undefined);
            expect(annotationController.annotator.bindCustomListenersOnThread).to.not.be.called;
        });

        it('should bind custom listeners on thread', () => {
            const thread = {
                addListener: sandbox.stub()
            };
            annotationController.annotator = {
                bindCustomListenersOnThread: sandbox.stub()
            };

            annotationController.bindCustomListenersOnThread(thread);
            expect(annotationController.annotator.bindCustomListenersOnThread).to.be.called;
            expect(thread.addListener).to.be.called;
        });
    });

    describe('unbindCustomListenersOnThread()', () => {
        it('should do nothing when the input is empty', () => {
            const thread = {
                removeAllListeners: sandbox.stub()
            };

            annotationController.unbindCustomListenersOnThread(undefined);
            expect(thread.removeAllListeners).to.not.be.called;
        });

        it('should bind custom listeners on thread', () => {
            const thread = {
                removeAllListeners: sandbox.stub()
            };

            annotationController.unbindCustomListenersOnThread(thread);
            expect(thread.removeAllListeners).to.have.callCount(4);
        });
    });
});
