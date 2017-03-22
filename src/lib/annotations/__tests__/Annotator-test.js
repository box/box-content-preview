/* eslint-disable no-unused-expressions */
import Annotator from '../Annotator';
import * as constants from '../annotationConstants';
import * as annotatorUtil from '../annotatorUtil';
import AnnotationService from '../AnnotationService';

let annotator;
let stubs = {};
const sandbox = sinon.sandbox.create();

describe('lib/annotations/Annotator', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/__tests__/Annotator-test.html');

        annotator = new Annotator({
            annotatedElement: document.querySelector('.annotated-element'),
            annotationService: {},
            fileVersionID: 1
        });

        stubs.thread = {
            show: () => {},
            hide: () => {},
            addListener: () => {},
            unbindCustomListenersOnThread: () => {},
            removeAllListeners: () => {},
            type: 'type'
        };
        stubs.threadMock = sandbox.mock(stubs.thread);

        stubs.thread2 = {
            show: () => {},
            hide: () => {},
            addListener: () => {},
            unbindCustomListenersOnThread: () => {},
            removeAllListeners: () => {},
            type: 'type'
        };
        stubs.threadMock2 = sandbox.mock(stubs.thread2);

        stubs.thread3 = {
            show: () => {},
            hide: () => {},
            addListener: () => {},
            unbindCustomListenersOnThread: () => {},
            removeAllListeners: () => {},
            type: 'type'
        };
        stubs.threadMock3 = sandbox.mock(stubs.thread3);
        sandbox.stub(annotator, 'emit');
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

            expect(scaleStub).to.be.called;
            expect(setupAnnotations).to.be.called;
        });
    });

    describe('showAnnotations()', () => {
        it('should fetch and then render annotations', () => {
            const renderStub = sandbox.stub(annotator, 'renderAnnotations');
            const fetchPromise = Promise.resolve();
            const fetchStub = sandbox.stub(annotator, 'fetchAnnotations').returns(fetchPromise);

            annotator.showAnnotations();

            expect(fetchStub).to.be.called;
            return fetchPromise.then(() => {
                expect(renderStub).to.be.called;
            });
        });
    });

    describe('hideAnnotations()', () => {
        it('should call hide on each thread in map', () => {
            annotator._threads = {
                1: [stubs.thread],
                2: [stubs.thread2, stubs.thread3]
            };

            stubs.threadMock.expects('hide');
            stubs.threadMock2.expects('hide');
            stubs.threadMock3.expects('hide');
            annotator.hideAnnotations();
        });
    });

    describe('hideAnnotationsOnPage()', () => {
        it('should call hide on each thread in map on page 1', () => {
            annotator._threads = {
                1: [stubs.thread],
                2: [stubs.thread2, stubs.thread3]
            };

            stubs.threadMock.expects('hide');
            stubs.threadMock2.expects('hide').never();
            stubs.threadMock3.expects('hide').never();
            annotator.hideAnnotationsOnPage('1');
        });
    });

    describe('renderAnnotations()', () => {
        it('should call show on each thread', () => {
            annotator._threads = {
                1: [stubs.thread],
                2: [stubs.thread2, stubs.thread3]
            };

            stubs.threadMock.expects('show');
            stubs.threadMock2.expects('show');
            stubs.threadMock3.expects('show');
            annotator.renderAnnotations();
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

            stubs.threadMock.expects('show');
            stubs.threadMock2.expects('show').never();
            stubs.threadMock3.expects('show').never();
            annotator.renderAnnotationsOnPage('1');
        });
    });

    describe('setScale()', () => {
        it('should set a data-scale attribute on the annotated element', () => {
            annotator.setScale(10);
            const annotatedEl = document.querySelector('.annotated-element');
            expect(annotatedEl).to.have.attribute('data-scale', '10');
        });
    });

    describe('togglePointModeHandler()', () => {
        beforeEach(() => {
            stubs.pointMode = sandbox.stub(annotator, 'isInPointMode');
            sandbox.stub(annotator.notification, 'show');
            sandbox.stub(annotator.notification, 'hide');
            sandbox.stub(annotator, 'unbindDOMListeners');
            sandbox.stub(annotator, 'bindDOMListeners');
            sandbox.stub(annotator, 'bindPointModeListeners');
            sandbox.stub(annotator, 'unbindPointModeListeners');
        });

        it('should turn annotation mode on if it is off', () => {
            const destroyStub = sandbox.stub(annotator, 'destroyPendingThreads');
            stubs.pointMode.returns(false);

            annotator.togglePointModeHandler();

            const annotatedEl = document.querySelector('.annotated-element');
            expect(destroyStub).to.be.called;
            expect(annotator.notification.show).to.be.called;
            expect(annotator.emit).to.be.calledWith('pointmodeenter');
            expect(annotatedEl).to.have.class(constants.CLASS_ANNOTATION_POINT_MODE);
            expect(annotator.unbindDOMListeners).to.be.called;
            expect(annotator.bindPointModeListeners).to.be.called;
        });

        it('should turn annotation mode off if it is on', () => {
            const destroyStub = sandbox.stub(annotator, 'destroyPendingThreads');
            stubs.pointMode.returns(true);

            annotator.togglePointModeHandler();

            const annotatedEl = document.querySelector('.annotated-element');
            expect(destroyStub).to.be.called;
            expect(annotator.notification.hide).to.be.called;
            expect(annotator.emit).to.be.calledWith('pointmodeexit');
            expect(annotatedEl).to.not.have.class(constants.CLASS_ANNOTATION_POINT_MODE);
            expect(annotator.unbindPointModeListeners).to.be.called;
            expect(annotator.bindDOMListeners).to.be.called;
        });
    });

    describe('setupAnnotations', () => {
        it('should initialize thread map and bind DOM listeners', () => {
            sandbox.stub(annotator, 'bindDOMListeners');
            sandbox.stub(annotator, 'bindCustomListenersOnService');
            sandbox.stub(annotator, 'addListener');

            annotator.setupAnnotations();

            expect(Object.keys(annotator._threads).length === 0).to.be.true;
            expect(annotator.bindDOMListeners).to.be.called;
            expect(annotator.bindCustomListenersOnService).to.be.called;
            expect(annotator.addListener).to.be.calledWith('annotationerror', sinon.match.func);
        });
    });

    describe('fetchAnnotations', () => {
        beforeEach(() => {
            annotator._annotationService = {
                getThreadMap: () => {}
            };
            stubs.serviceMock = sandbox.mock(annotator._annotationService);

            const threadMap = {
                someID: [{}, {}],
                someID2: [{}]
            };
            stubs.threadPromise = Promise.resolve(threadMap);
            stubs.serviceMock.expects('getThreadMap').returns(stubs.threadPromise);
        });

        it('should reset and create a new thread map by fetching annotation data from the server if the first annotation in the thread is valid', () => {
            sandbox.stub(annotatorUtil, 'checkThreadValid').returns(true);
            sandbox.stub(annotator, 'createAnnotationThread').returns(stubs.thread);
            sandbox.stub(annotator, 'bindCustomListenersOnThread');

            const result = annotator.fetchAnnotations();

            return stubs.threadPromise.then(() => {
                expect(Object.keys(annotator._threads).length === 0).to.be.true;
                expect(annotator.createAnnotationThread).to.be.calledTwice;
                expect(annotator.bindCustomListenersOnThread).to.be.calledTwice;
                expect(result).to.be.an.object;
            });
        });

        it('should reset and not create a new thread mapif the first annotation in the thread is not valid', () => {
            sandbox.stub(annotatorUtil, 'checkThreadValid').returns(false);
            sandbox.stub(annotator, 'createAnnotationThread');
            sandbox.stub(annotator, 'bindCustomListenersOnThread');

            const result = annotator.fetchAnnotations();

            return stubs.threadPromise.then(() => {
                expect(Object.keys(annotator._threads).length === 0).to.be.true;
                expect(annotator.createAnnotationThread).to.not.be.called;
                expect(annotator.bindCustomListenersOnThread).to.not.be.called;
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
            expect(annotator._annotationService.addListener).to.not.be.called;
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
            expect(addListenerStub).to.be.calledWith('annotationerror', sinon.match.func);
        });
    });

    describe('unbindCustomListenersOnService', () => {
        it('should do nothing if the service does not exist', () => {
            annotator._annotationService = {
                removeListener: sandbox.stub()
            };

            annotator.unbindCustomListenersOnService();
            expect(annotator._annotationService.removeListener).to.not.be.called;
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
            expect(removeListenerStub).to.be.called;
        });
    });

    describe('bindCustomListenersOnThread', () => {
        it('should bind custom listeners on the thread', () => {
            stubs.threadMock.expects('addListener').withArgs('threaddeleted', sinon.match.func);
            stubs.threadMock.expects('addListener').withArgs('threadcleanup', sinon.match.func);
            annotator.bindCustomListenersOnThread(stubs.thread);
        });
    });

    describe('unbindCustomListenersOnThread', () => {
        it('should unbind custom listeners from the thread', () => {
            stubs.threadMock.expects('removeAllListeners').withArgs('threaddeleted');
            stubs.threadMock.expects('removeAllListeners').withArgs('threadcleanup');
            annotator.unbindCustomListenersOnThread(stubs.thread);
        });
    });

    describe('bindPointModeListeners', () => {
        it('should bind point mode click handler', () => {
            sandbox.stub(annotator._annotatedElement, 'addEventListener');
            annotator.bindPointModeListeners();
            expect(annotator._annotatedElement.addEventListener).to.be.calledWith('click', annotator.pointClickHandler);
        });
    });

    describe('unbindPointModeListeners', () => {
        it('should unbind point mode click handler', () => {
            sandbox.stub(annotator._annotatedElement, 'removeEventListener');
            annotator.unbindPointModeListeners();
            expect(annotator._annotatedElement.removeEventListener).to.be.calledWith('click', annotator.pointClickHandler);
        });
    });

    describe('pointClickHandler', () => {
        const event = {
            stopPropagation: () => {}
        };

        beforeEach(() => {
            stubs.destroy = sandbox.stub(annotator, 'destroyPendingThreads');
            stubs.create = sandbox.stub(annotator, 'createAnnotationThread');
            stubs.getLocation = sandbox.stub(annotator, 'getLocationFromEvent');
            sandbox.stub(annotator, 'bindCustomListenersOnThread');
            sandbox.stub(annotator, 'togglePointModeHandler');
        });

        it('should not do anything if there are pending threads', () => {
            stubs.destroy.returns(true);
            stubs.create.returns(stubs.thread);

            stubs.threadMock.expects('show').never();
            annotator.pointClickHandler(event);

            expect(annotator.getLocationFromEvent).to.not.be.called;
            expect(annotator.bindCustomListenersOnThread).to.not.be.called;
            expect(annotator.togglePointModeHandler).to.not.be.called;
        });

        it('should not create a thread if a location object cannot be inferred from the event', () => {
            stubs.destroy.returns(false);
            stubs.getLocation.returns(null);
            stubs.create.returns(stubs.thread);

            stubs.threadMock.expects('show').never();
            annotator.pointClickHandler(event);

            expect(annotator.getLocationFromEvent).to.be.called;
            expect(annotator.bindCustomListenersOnThread).to.not.be.called;
            expect(annotator.togglePointModeHandler).to.be.called;
        });

        it('should create, show, and bind listeners to a thread', () => {
            stubs.destroy.returns(false);
            stubs.getLocation.returns({});
            stubs.create.returns(stubs.thread);

            stubs.threadMock.expects('show');
            annotator.pointClickHandler(event);

            expect(annotator.getLocationFromEvent).to.be.called;
            expect(annotator.bindCustomListenersOnThread).to.be.called;
            expect(annotator.togglePointModeHandler).to.be.called;
        });
    });

    describe('addToThreadMap', () => {
        it('should emit an error message and do nothing if thread is invalid', () => {
            stubs.thread.location = { page: 2 };
            sandbox.stub(annotatorUtil, 'checkThreadValid').returns(false);

            annotator.init();
            annotator.addThreadToMap(stubs.thread);
            expect(annotator.emit).to.be.calledWith('annotationerror', {
                reason: 'validation'
            });
            expect(annotator._threads).to.deep.equal({});
        });

        it('should add valid threads to the thread map', () => {
            sandbox.stub(annotatorUtil, 'checkThreadValid').returns(true);
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
                location: { page: 2 },
                type: 'type',
                state: constants.ANNOTATION_STATE_PENDING,
                destroy: () => {},
                unbindCustomListenersOnThread: () => {},
                removeAllListeners: () => {}
            };
            stubs.threadMock = sandbox.mock(stubs.thread);
            sandbox.stub(annotatorUtil, 'checkThreadValid').returns(true);
        });

        it('should destroy and return true if there are any pending threads', () => {
            annotator.init();
            annotator.addThreadToMap(stubs.thread);
            stubs.threadMock.expects('destroy');
            const destroyed = annotator.destroyPendingThreads();
            expect(destroyed).to.equal(true);
        });

        it('should not destroy and return false if there are no threads', () => {
            annotator.init();
            stubs.threadMock.expects('destroy').never();
            const destroyed = annotator.destroyPendingThreads();
            expect(destroyed).to.equal(false);
        });

        it('should not destroy and return false if the threads are not pending', () => {
            stubs.thread.state = 'NOT_PENDING';
            annotator.init();
            annotator.addThreadToMap(stubs.thread);
            stubs.threadMock.expects('destroy').never();
            const destroyed = annotator.destroyPendingThreads();
            expect(destroyed).to.equal(false);
        });

        it('should destroy only pending threads, and return true', () => {
            stubs.thread.state = 'NOT_PENDING';
            const pendingThread = {
                location: { page: 2 },
                type: 'type',
                state: constants.ANNOTATION_STATE_PENDING,
                destroy: () => {},
                unbindCustomListenersOnThread: () => {},
                removeAllListeners: () => {}
            };
            stubs.pendingMock = sandbox.mock(pendingThread);

            annotator.init();
            annotator.addThreadToMap(stubs.thread);
            annotator.addThreadToMap(pendingThread);

            stubs.threadMock.expects('destroy').never();
            stubs.pendingMock.expects('destroy');
            const destroyed = annotator.destroyPendingThreads();

            expect(destroyed).to.equal(true);
        });
    });
});
