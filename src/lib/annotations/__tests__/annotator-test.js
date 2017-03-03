/* eslint-disable no-unused-expressions */
import Annotator from '../annotator';
import * as constants from '../annotation-constants';
import AnnotationService from '../annotation-service';

let annotator;
let stubs = {};
const sandbox = sinon.sandbox.create();

describe('annotator', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/__tests__/annotator-test.html');

        annotator = new Annotator({
            annotatedElement: document.querySelector('.annotated-element'),
            annotationService: {},
            fileVersionID: 1
        });

        stubs.thread = {
            show: sandbox.stub(),
            hide: sandbox.stub(),
            addListener: sandbox.stub(),
            unbindCustomListenersOnThread: sandbox.stub(),
            removeAllListeners: sandbox.stub()
        };
        stubs.thread2 = {
            show: sandbox.stub(),
            hide: sandbox.stub(),
            addListener: sandbox.stub(),
            unbindCustomListenersOnThread: sandbox.stub(),
            removeAllListeners: sandbox.stub()
        };
        stubs.thread3 = {
            show: sandbox.stub(),
            hide: sandbox.stub(),
            addListener: sandbox.stub(),
            unbindCustomListenersOnThread: sandbox.stub(),
            removeAllListeners: sandbox.stub()
        };
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        if (typeof annotator.destroy === 'function') {
            annotator.destroy();
            annotator = null;
        }

        stubs = {};
    });

    describe('constructor()', () => {
        it('should initialize a notification', () => {
            expect(annotator.notification).to.not.be.null;
        });
    });

    describe('destroy()', () => {
        it('should unbind custom listeners on thread and unbind DOM listeners', () => {
            annotator._threads = {
                1: [stubs.thread]
            };

            const unbindCustomStub = sandbox.stub(annotator, 'unbindCustomListenersOnThread');
            const unbindDOMStub = sandbox.stub(annotator, 'unbindDOMListeners');
            const unbindCustomListenersOnService = sandbox.stub(annotator, 'unbindCustomListenersOnService');


            annotator.destroy();

            expect(unbindCustomStub).to.be.calledWith(stubs.thread);
            expect(unbindDOMStub).to.be.called;
            expect(unbindCustomListenersOnService).to.be.called;
        });
    });

    describe('init()', () => {
        it('should set scale and setup annotations', () => {
            const scaleStub = sandbox.stub(annotator, 'setScale');
            const setupAnnotations = sandbox.stub(annotator, 'setupAnnotations');

            annotator.init();

            expect(scaleStub).to.have.been.called;
            expect(setupAnnotations).to.have.been.called;
        });
    });

    describe('showAnnotations()', () => {
        it('should fetch and then render annotations', () => {
            const renderStub = sandbox.stub(annotator, 'renderAnnotations');
            const fetchPromise = Promise.resolve();
            const fetchStub = sandbox.stub(annotator, 'fetchAnnotations').returns(fetchPromise);

            annotator.showAnnotations();

            expect(fetchStub).to.have.been.called;
            return fetchPromise.then(() => {
                expect(renderStub).to.have.been.called;
            });
        });
    });

    describe('hideAnnotations()', () => {
        it('should call hide on each thread in map', () => {
            annotator._threads = {
                1: [stubs.thread],
                2: [stubs.thread2, stubs.thread3]
            };

            annotator.hideAnnotations();

            expect(stubs.thread.hide).to.have.been.called;
            expect(stubs.thread2.hide).to.have.been.called;
            expect(stubs.thread3.hide).to.have.been.called;
        });
    });

    describe('hideAnnotationsOnPage()', () => {
        it('should call hide on each thread in map on page 1', () => {
            annotator._threads = {
                1: [stubs.thread],
                2: [stubs.thread2, stubs.thread3]
            };

            annotator.hideAnnotationsOnPage('1');

            expect(stubs.thread.hide).to.have.been.called;
            expect(stubs.thread2.hide).to.have.not.been.called;
            expect(stubs.thread3.hide).to.have.not.been.called;
        });
    });

    describe('renderAnnotations()', () => {
        it('should call show on each thread', () => {
            annotator._threads = {
                1: [stubs.thread],
                2: [stubs.thread2, stubs.thread3]
            };

            annotator.renderAnnotations();

            expect(stubs.thread.show).to.have.been.called;
            expect(stubs.thread2.show).to.have.been.called;
            expect(stubs.thread3.show).to.have.been.called;
        });
    });

    describe('renderAnnotationsOnPage()', () => {
        it('should call show on each thread', () => {
            stubs.thread2.location = { page: 2 };
            stubs.thread3.location = { page: 2 };
            annotator._threads = {
                1: [stubs.thread],
                2: [stubs.thread2, stubs.thread3]
            };

            annotator.renderAnnotationsOnPage('1');

            expect(stubs.thread.show).to.have.been.called;
            expect(stubs.thread2.show).to.have.not.been.called;
            expect(stubs.thread3.show).to.have.not.been.called;
        });
    });

    describe('setScale()', () => {
        it('should set a data-scale attribute on the annotated element', () => {
            annotator.setScale(10);
            expect(document.querySelector('.annotated-element').getAttribute('data-scale')).to.equal('10');
        });
    });

    describe('togglePointModeHandler()', () => {
        it('should turn annotation mode on if it is off', () => {
            const destroyStub = sandbox.stub(annotator, 'destroyPendingThreads');
            sandbox.stub(annotator, 'isInPointMode').returns(false);
            sandbox.stub(annotator.notification, 'show');
            sandbox.stub(annotator, 'emit');
            sandbox.stub(annotator, 'unbindDOMListeners');
            sandbox.stub(annotator, 'bindPointModeListeners');

            annotator.togglePointModeHandler();

            expect(destroyStub).to.have.been.called;
            expect(annotator.notification.show).to.have.been.called;
            expect(annotator.emit).to.have.been.calledWith('pointmodeenter');
            expect(document.querySelector('.annotated-element').classList.contains(constants.CLASS_ANNOTATION_POINT_MODE)).to.be.true;
            expect(annotator.unbindDOMListeners).to.have.been.called;
            expect(annotator.bindPointModeListeners).to.have.been.called;
        });

        it('should turn annotation mode off if it is on', () => {
            const destroyStub = sandbox.stub(annotator, 'destroyPendingThreads');
            sandbox.stub(annotator, 'isInPointMode').returns(true);
            sandbox.stub(annotator.notification, 'hide');
            sandbox.stub(annotator, 'emit');
            sandbox.stub(annotator, 'bindDOMListeners');
            sandbox.stub(annotator, 'unbindPointModeListeners');

            annotator.togglePointModeHandler();

            expect(destroyStub).to.have.been.called;
            expect(annotator.notification.hide).to.have.been.called;
            expect(annotator.emit).to.have.been.calledWith('pointmodeexit');
            expect(document.querySelector('.annotated-element').classList.contains(constants.CLASS_ANNOTATION_POINT_MODE)).to.be.false;
            expect(annotator.unbindPointModeListeners).to.have.been.called;
            expect(annotator.bindDOMListeners).to.have.been.called;
        });
    });

    describe('setupAnnotations', () => {
        it('should initialize thread map and bind DOM listeners', () => {
            sandbox.stub(annotator, 'bindDOMListeners');
            sandbox.stub(annotator, 'bindCustomListenersOnService');


            annotator.setupAnnotations();

            expect(Object.keys(annotator._threads).length === 0).to.be.true;
            expect(annotator.bindDOMListeners).to.have.been.called;
            expect(annotator.bindCustomListenersOnService).to.have.been.called;
        });
    });

    describe('fetchAnnotations', () => {
        it('should reset thread map and create a new thread map by fetching annotation data from the server', () => {
            const threadMap = {
                someID: [{}, {}],
                someID2: [{}]
            };
            const threadPromise = Promise.resolve(threadMap);
            annotator._annotationService = {
                getThreadMap: sandbox.stub().returns(threadPromise)
            };
            sandbox.stub(annotator, 'createAnnotationThread');
            sandbox.stub(annotator, 'bindCustomListenersOnThread');

            const result = annotator.fetchAnnotations();

            return threadPromise.then(() => {
                expect(Object.keys(annotator._threads).length === 0).to.be.true;
                expect(annotator.createAnnotationThread).to.have.been.calledTwice;
                expect(annotator.bindCustomListenersOnThread).to.have.been.calledTwice;
                expect(result).to.be.an.object;
            });
        });
    });

    describe('bindCustomListenersOnService', () => {
        it('should do nothing if the service does not exist', () => {
            annotator._annotationService = {
                addListener: sandbox.stub()
            };

            annotator.bindCustomListenersOnService();
            expect(annotator._annotationService.addListener).to.have.not.been.called;
        });

        it('should add an event listener', () => {
            annotator._annotationService = new AnnotationService({
                apiHost: 'API',
                fileId: 1,
                token: 'someToken',
                canAnnotate: true,
                canDelete: true
            });
            const addListenerStub = sandbox.stub(annotator._annotationService, 'addListener');

            annotator.bindCustomListenersOnService();
            expect(addListenerStub).to.have.been.called;
        });
    });

    describe('unbindCustomListenersOnService', () => {
        it('should do nothing if the service does not exist', () => {
            annotator._annotationService = {
                removeListener: sandbox.stub()
            };

            annotator.unbindCustomListenersOnService();
            expect(annotator._annotationService.removeListener).to.have.not.been.called;
        });

        it('should remove an event listener', () => {
            annotator._annotationService = new AnnotationService({
                apiHost: 'API',
                fileId: 1,
                token: 'someToken',
                canAnnotate: true,
                canDelete: true
            });
            const removeListenerStub = sandbox.stub(annotator._annotationService, 'removeAllListeners');

            annotator.unbindCustomListenersOnService();
            expect(removeListenerStub).to.have.been.called;
        });
    });

    describe('bindCustomListenersOnThread', () => {
        it('should bind custom listeners on the thread', () => {
            annotator.bindCustomListenersOnThread(stubs.thread);

            expect(stubs.thread.addListener).to.have.been.calledWith('threaddeleted', sinon.match.func);
            expect(stubs.thread.addListener).to.have.been.calledWith('threadcleanup', sinon.match.func);
        });
    });

    describe('unbindCustomListenersOnThread', () => {
        it('should unbind custom listeners from the thread', () => {
            annotator.unbindCustomListenersOnThread(stubs.thread);

            expect(stubs.thread.removeAllListeners).to.have.been.calledWith('threaddeleted');
            expect(stubs.thread.removeAllListeners).to.have.been.calledWith('threadcleanup');
        });
    });

    describe('bindPointModeListeners', () => {
        it('should bind point mode click handler', () => {
            sandbox.stub(annotator._annotatedElement, 'addEventListener');
            annotator.bindPointModeListeners();
            expect(annotator._annotatedElement.addEventListener).to.have.been.calledWith('click', annotator.pointClickHandler);
        });
    });

    describe('unbindPointModeListeners', () => {
        it('should unbind point mode click handler', () => {
            sandbox.stub(annotator._annotatedElement, 'removeEventListener');
            annotator.unbindPointModeListeners();
            expect(annotator._annotatedElement.removeEventListener).to.have.been.calledWith('click', annotator.pointClickHandler);
        });
    });

    describe('pointClickHandler', () => {
        const event = {
            stopPropagation: () => {}
        };

        it('should not do anything if there are pending threads', () => {
            sandbox.stub(annotator, 'destroyPendingThreads').returns(true);
            sandbox.stub(annotator, 'getLocationFromEvent');
            sandbox.stub(annotator, 'createAnnotationThread').returns(stubs.thread);
            sandbox.stub(annotator, 'bindCustomListenersOnThread');
            sandbox.stub(annotator, 'togglePointModeHandler');

            annotator.pointClickHandler(event);

            expect(annotator.getLocationFromEvent).to.not.have.been.called;
            expect(stubs.thread.show).to.not.have.been.called;
            expect(annotator.bindCustomListenersOnThread).to.not.have.been.called;
            expect(annotator.togglePointModeHandler).to.not.have.been.called;
        });

        it('should not create a thread if a location object cannot be inferred from the event', () => {
            sandbox.stub(annotator, 'destroyPendingThreads').returns(false);
            sandbox.stub(annotator, 'getLocationFromEvent').returns(null);
            sandbox.stub(annotator, 'createAnnotationThread').returns(stubs.thread);
            sandbox.stub(annotator, 'bindCustomListenersOnThread');
            sandbox.stub(annotator, 'togglePointModeHandler');

            annotator.pointClickHandler(event);

            expect(annotator.getLocationFromEvent).to.have.been.called;
            expect(stubs.thread.show).to.not.have.been.called;
            expect(annotator.bindCustomListenersOnThread).to.not.have.been.called;
            expect(annotator.togglePointModeHandler).to.have.been.called;
        });

        it('should create, show, and bind listeners to a thread', () => {
            sandbox.stub(annotator, 'destroyPendingThreads').returns(false);
            sandbox.stub(annotator, 'getLocationFromEvent').returns({});
            sandbox.stub(annotator, 'createAnnotationThread').returns(stubs.thread);
            sandbox.stub(annotator, 'bindCustomListenersOnThread');
            sandbox.stub(annotator, 'togglePointModeHandler');

            annotator.pointClickHandler(event);

            expect(annotator.getLocationFromEvent).to.have.been.called;
            expect(stubs.thread.show).to.have.been.called;
            expect(annotator.bindCustomListenersOnThread).to.have.been.called;
            expect(annotator.togglePointModeHandler).to.have.been.called;
        });
    });

    describe('addToThreadMap', () => {
        it('should add thread to the thread map', () => {
            stubs.thread.location = { page: 2 };
            stubs.thread2.location = { page: 3 };
            stubs.thread3.location = { page: 2 };

            annotator.init();
            annotator.addThreadToMap(stubs.thread);

            expect(annotator._threads).to.deep.equal({
                2: [stubs.thread]
            });

            annotator.addThreadToMap(stubs.thread2);
            annotator.addThreadToMap(stubs.thread3);

            expect(annotator._threads).to.deep.equal({
                2: [stubs.thread, stubs.thread3],
                3: [stubs.thread2]
            });
        });
    });

    describe('isInPointMode', () => {
        it('should return whether the annotator is in point mode or not', () => {
            annotator._annotatedElement.classList.add(constants.CLASS_ANNOTATION_POINT_MODE);
            expect(annotator.isInPointMode()).to.be.true;

            annotator._annotatedElement.classList.remove(constants.CLASS_ANNOTATION_POINT_MODE);
            expect(annotator.isInPointMode()).to.be.false;
        });
    });

    describe('destroyPendingThreads', () => {
        beforeEach(() => {
            stubs.thread = {
                location: {
                    page: 2
                },
                state: constants.ANNOTATION_STATE_PENDING,
                destroy: () => {},
                unbindCustomListenersOnThread: sandbox.stub(),
                removeAllListeners: sandbox.stub()
            };
        });

        it('should destroy and return true if there are any pending threads', () => {
            const destroyStub = sandbox.stub(stubs.thread, 'destroy');
            annotator.init();
            annotator.addThreadToMap(stubs.thread);
            const destroyed = annotator.destroyPendingThreads();

            expect(destroyStub).to.be.called;
            expect(destroyed).to.equal(true);
        });

        it('should not destroy and return false if there are no threads', () => {
            const destroyStub = sandbox.stub(stubs.thread, 'destroy');
            annotator.init();
            const destroyed = annotator.destroyPendingThreads();

            expect(destroyStub).to.not.be.called;
            expect(destroyed).to.equal(false);
        });

        it('should not destroy and return false if the threads are not pending', () => {
            stubs.thread.state = 'NOT_PENDING';
            const destroyStub = sandbox.stub(stubs.thread, 'destroy');
            annotator.init();
            annotator.addThreadToMap(stubs.thread);
            const destroyed = annotator.destroyPendingThreads();

            expect(destroyStub).to.not.be.called;
            expect(destroyed).to.equal(false);
        });

        it('should destroy only pending threads, and return true', () => {
            stubs.thread.state = 'NOT_PENDING';
            const pendingThread = {
                location: {
                    page: 2
                },
                state: constants.ANNOTATION_STATE_PENDING,
                destroy: () => {},
                unbindCustomListenersOnThread: sandbox.stub(),
                removeAllListeners: sandbox.stub()
            };
            const destroyStub = sandbox.stub(stubs.thread, 'destroy');
            const destroyStub2 = sandbox.stub(pendingThread, 'destroy');
            annotator.init();
            annotator.addThreadToMap(stubs.thread);
            annotator.addThreadToMap(pendingThread);
            const destroyed = annotator.destroyPendingThreads();

            expect(destroyStub).to.not.be.called;
            expect(destroyStub2).to.be.called;
            expect(destroyed).to.equal(true);
        });
    });
});
