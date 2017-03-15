/* eslint-disable no-unused-expressions */
import Annotator from '../Annotator';
import * as constants from '../annotationConstants';
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
            show: sandbox.stub(),
            hide: sandbox.stub(),
            addListener: sandbox.stub(),
            unbindCustomListenersOnThread: sandbox.stub(),
            removeAllListeners: sandbox.stub(),
            type: 'type'
        };
        stubs.thread2 = {
            show: sandbox.stub(),
            hide: sandbox.stub(),
            addListener: sandbox.stub(),
            unbindCustomListenersOnThread: sandbox.stub(),
            removeAllListeners: sandbox.stub(),
            type: 'type'
        };
        stubs.thread3 = {
            show: sandbox.stub(),
            hide: sandbox.stub(),
            addListener: sandbox.stub(),
            unbindCustomListenersOnThread: sandbox.stub(),
            removeAllListeners: sandbox.stub(),
            type: 'type'
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

            annotator.hideAnnotations();

            expect(stubs.thread.hide).to.be.called;
            expect(stubs.thread2.hide).to.be.called;
            expect(stubs.thread3.hide).to.be.called;
        });
    });

    describe('hideAnnotationsOnPage()', () => {
        it('should call hide on each thread in map on page 1', () => {
            annotator._threads = {
                1: [stubs.thread],
                2: [stubs.thread2, stubs.thread3]
            };

            annotator.hideAnnotationsOnPage('1');

            expect(stubs.thread.hide).to.be.called;
            expect(stubs.thread2.hide).to.not.be.called;
            expect(stubs.thread3.hide).to.not.be.called;
        });
    });

    describe('renderAnnotations()', () => {
        it('should call show on each thread', () => {
            annotator._threads = {
                1: [stubs.thread],
                2: [stubs.thread2, stubs.thread3]
            };

            annotator.renderAnnotations();

            expect(stubs.thread.show).to.be.called;
            expect(stubs.thread2.show).to.be.called;
            expect(stubs.thread3.show).to.be.called;
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

            expect(stubs.thread.show).to.be.called;
            expect(stubs.thread2.show).to.not.be.called;
            expect(stubs.thread3.show).to.not.be.called;
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

            expect(destroyStub).to.be.called;
            expect(annotator.notification.show).to.be.called;
            expect(annotator.emit).to.be.calledWith('pointmodeenter');
            expect(document.querySelector('.annotated-element').classList.contains(constants.CLASS_ANNOTATION_POINT_MODE)).to.be.true;
            expect(annotator.unbindDOMListeners).to.be.called;
            expect(annotator.bindPointModeListeners).to.be.called;
        });

        it('should turn annotation mode off if it is on', () => {
            const destroyStub = sandbox.stub(annotator, 'destroyPendingThreads');
            sandbox.stub(annotator, 'isInPointMode').returns(true);
            sandbox.stub(annotator.notification, 'hide');
            sandbox.stub(annotator, 'emit');
            sandbox.stub(annotator, 'bindDOMListeners');
            sandbox.stub(annotator, 'unbindPointModeListeners');

            annotator.togglePointModeHandler();

            expect(destroyStub).to.be.called;
            expect(annotator.notification.hide).to.be.called;
            expect(annotator.emit).to.be.calledWith('pointmodeexit');
            expect(document.querySelector('.annotated-element').classList.contains(constants.CLASS_ANNOTATION_POINT_MODE)).to.be.false;
            expect(annotator.unbindPointModeListeners).to.be.called;
            expect(annotator.bindDOMListeners).to.be.called;
        });
    });

    describe('setupAnnotations', () => {
        it('should initialize thread map and bind DOM listeners', () => {
            sandbox.stub(annotator, 'bindDOMListeners');
            sandbox.stub(annotator, 'bindCustomListenersOnService');


            annotator.setupAnnotations();

            expect(Object.keys(annotator._threads).length === 0).to.be.true;
            expect(annotator.bindDOMListeners).to.be.called;
            expect(annotator.bindCustomListenersOnService).to.be.called;
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
            sandbox.stub(annotator, 'createAnnotationThread').returns(stubs.thread);
            sandbox.stub(annotator, 'bindCustomListenersOnThread');

            const result = annotator.fetchAnnotations();

            return threadPromise.then(() => {
                expect(Object.keys(annotator._threads).length === 0).to.be.true;
                expect(annotator.createAnnotationThread).to.be.calledTwice;
                expect(annotator.bindCustomListenersOnThread).to.be.calledTwice;
                expect(result).to.be.an.object;
            });
        });

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
                expect(annotator.createAnnotationThread).to.be.calledTwice;
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
            expect(addListenerStub).to.be.called;
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
            annotator.bindCustomListenersOnThread(stubs.thread);

            expect(stubs.thread.addListener).to.be.calledWith('threaddeleted', sinon.match.func);
            expect(stubs.thread.addListener).to.be.calledWith('threadcleanup', sinon.match.func);
        });
    });

    describe('unbindCustomListenersOnThread', () => {
        it('should unbind custom listeners from the thread', () => {
            annotator.unbindCustomListenersOnThread(stubs.thread);

            expect(stubs.thread.removeAllListeners).to.be.calledWith('threaddeleted');
            expect(stubs.thread.removeAllListeners).to.be.calledWith('threadcleanup');
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

        it('should not do anything if there are pending threads', () => {
            sandbox.stub(annotator, 'destroyPendingThreads').returns(true);
            sandbox.stub(annotator, 'getLocationFromEvent');
            sandbox.stub(annotator, 'createAnnotationThread').returns(stubs.thread);
            sandbox.stub(annotator, 'bindCustomListenersOnThread');
            sandbox.stub(annotator, 'togglePointModeHandler');

            annotator.pointClickHandler(event);

            expect(annotator.getLocationFromEvent).to.not.be.called;
            expect(stubs.thread.show).to.not.be.called;
            expect(annotator.bindCustomListenersOnThread).to.not.be.called;
            expect(annotator.togglePointModeHandler).to.not.be.called;
        });

        it('should not create a thread if a location object cannot be inferred from the event', () => {
            sandbox.stub(annotator, 'destroyPendingThreads').returns(false);
            sandbox.stub(annotator, 'getLocationFromEvent').returns(null);
            sandbox.stub(annotator, 'createAnnotationThread').returns(stubs.thread);
            sandbox.stub(annotator, 'bindCustomListenersOnThread');
            sandbox.stub(annotator, 'togglePointModeHandler');

            annotator.pointClickHandler(event);

            expect(annotator.getLocationFromEvent).to.be.called;
            expect(stubs.thread.show).to.not.be.called;
            expect(annotator.bindCustomListenersOnThread).to.not.be.called;
            expect(annotator.togglePointModeHandler).to.be.called;
        });

        it('should create, show, and bind listeners to a thread', () => {
            sandbox.stub(annotator, 'destroyPendingThreads').returns(false);
            sandbox.stub(annotator, 'getLocationFromEvent').returns({});
            sandbox.stub(annotator, 'createAnnotationThread').returns(stubs.thread);
            sandbox.stub(annotator, 'bindCustomListenersOnThread');
            sandbox.stub(annotator, 'togglePointModeHandler');

            annotator.pointClickHandler(event);

            expect(annotator.getLocationFromEvent).to.be.called;
            expect(stubs.thread.show).to.be.called;
            expect(annotator.bindCustomListenersOnThread).to.be.called;
            expect(annotator.togglePointModeHandler).to.be.called;
        });
    });

    describe('addToThreadMap', () => {
        it('should add valid threads to the thread map', () => {
            stubs.thread.location = { page: 2 };
            stubs.thread2.location = { page: 3 };
            stubs.thread3.location = { page: 2 };
            const invalidThread = { type: 'type' };
            const invalidThread2 = { location: 'type' };

            annotator.init();
            annotator.addThreadToMap(stubs.thread);

            expect(annotator._threads).to.deep.equal({
                2: [stubs.thread]
            });

            annotator.addThreadToMap(stubs.thread2);
            annotator.addThreadToMap(stubs.thread3);
            annotator.addThreadToMap(invalidThread);
            annotator.addThreadToMap(invalidThread2);

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
                type: 'type',
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
                type: 'type',
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
