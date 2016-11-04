/* eslint-disable no-unused-expressions */
import Annotator from '../annotator';
import * as constants from '../annotation-constants';
import AnnotationService from '../annotation-service';


let annotator;
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
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('constructor()', () => {
        it('should initialize a notification', () => {
            expect(annotator.notification).to.not.be.null;
        });
    });

    describe('destroy()', () => {
        it('should unbind custom listeners on thread and unbind DOM listeners', () => {
            const thread = {};
            annotator._threads = {
                1: [thread]
            };

            const unbindCustomStub = sandbox.stub(annotator, 'unbindCustomListenersOnThread');
            const unbindDOMStub = sandbox.stub(annotator, 'unbindDOMListeners');
            const unbindCustomListenersOnService = sandbox.stub(annotator, 'unbindCustomListenersOnService');


            annotator.destroy();

            expect(unbindCustomStub).to.be.calledWith(thread);
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
            const thread1 = { hide: sandbox.stub() };
            const thread2 = { hide: sandbox.stub() };
            const thread3 = { hide: sandbox.stub() };
            annotator._threads = {
                1: [thread1],
                2: [thread2, thread3]
            };

            annotator.hideAnnotations();

            expect(thread1.hide).to.have.been.called;
            expect(thread2.hide).to.have.been.called;
            expect(thread3.hide).to.have.been.called;
        });
    });

    describe('hideAnnotationsOnPage()', () => {
        it('should call hide on each thread in map on page 1', () => {
            const thread1 = { hide: sandbox.stub() };
            const thread2 = { hide: sandbox.stub() };
            const thread3 = { hide: sandbox.stub() };
            annotator._threads = {
                1: [thread1],
                2: [thread2, thread3]
            };

            annotator.hideAnnotationsOnPage('1');

            expect(thread1.hide).to.have.been.called;
            expect(thread2.hide).to.have.not.been.called;
            expect(thread3.hide).to.have.not.been.called;
        });
    });

    describe('renderAnnotations()', () => {
        it('should hide annotations and call show on each thread', () => {
            const thread1 = { show: sandbox.stub() };
            const thread2 = { show: sandbox.stub() };
            const thread3 = { show: sandbox.stub() };
            annotator._threads = {
                1: [thread1],
                2: [thread2, thread3]
            };
            const hideStub = sandbox.stub(annotator, 'hideAnnotations');

            annotator.renderAnnotations();

            expect(hideStub).to.have.been.called;
            expect(thread1.show).to.have.been.called;
            expect(thread2.show).to.have.been.called;
            expect(thread3.show).to.have.been.called;
        });
    });

    describe('renderAnnotationsOnPage()', () => {
        it('should hide annotations and call show on each thread', () => {
            const thread1 = { show: sandbox.stub() };
            const thread2 = { show: sandbox.stub() };
            const thread3 = { show: sandbox.stub() };
            annotator._threads = {
                1: [thread1],
                2: [thread2, thread3]
            };
            const hideStub = sandbox.stub(annotator, 'hideAnnotationsOnPage');

            annotator.renderAnnotationsOnPage('1');

            expect(hideStub).to.have.been.called;
            expect(thread1.show).to.have.been.called;
            expect(thread2.show).to.have.not.been.called;
            expect(thread3.show).to.have.not.been.called;
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
            const destroyStub = sandbox.stub(annotator, '_destroyPendingThreads');
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
            const destroyStub = sandbox.stub(annotator, '_destroyPendingThreads');
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
                api: 'API',
                fileID: 1,
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
                api: 'API',
                fileID: 1,
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
            const thread = {
                addListener: sandbox.stub()
            };

            annotator.bindCustomListenersOnThread(thread);

            expect(thread.addListener).to.have.been.calledWith('threaddeleted', sinon.match.func);
            expect(thread.addListener).to.have.been.calledWith('threadcleanup', sinon.match.func);
        });
    });

    describe('unbindCustomListenersOnThread', () => {
        it('should unbind custom listeners from the thread', () => {
            const thread = {
                removeAllListeners: sandbox.stub()
            };

            annotator.unbindCustomListenersOnThread(thread);

            expect(thread.removeAllListeners).to.have.been.calledWith('threaddeleted');
            expect(thread.removeAllListeners).to.have.been.calledWith('threadcleanup');
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
            const thread = {
                show: sandbox.stub()
            };
            sandbox.stub(annotator, '_destroyPendingThreads').returns(true);
            sandbox.stub(annotator, 'getLocationFromEvent');
            sandbox.stub(annotator, 'createAnnotationThread').returns(thread);
            sandbox.stub(annotator, 'bindCustomListenersOnThread');
            sandbox.stub(annotator, 'togglePointModeHandler');

            annotator.pointClickHandler(event);

            expect(annotator.getLocationFromEvent).to.not.have.been.called;
            expect(thread.show).to.not.have.been.called;
            expect(annotator.bindCustomListenersOnThread).to.not.have.been.called;
            expect(annotator.togglePointModeHandler).to.not.have.been.called;
        });

        it('should not create a thread if a location object cannot be inferred from the event', () => {
            const thread = {
                show: sandbox.stub()
            };
            sandbox.stub(annotator, '_destroyPendingThreads').returns(false);
            sandbox.stub(annotator, 'getLocationFromEvent').returns(null);
            sandbox.stub(annotator, 'createAnnotationThread').returns(thread);
            sandbox.stub(annotator, 'bindCustomListenersOnThread');
            sandbox.stub(annotator, 'togglePointModeHandler');

            annotator.pointClickHandler(event);

            expect(annotator.getLocationFromEvent).to.have.been.called;
            expect(thread.show).to.not.have.been.called;
            expect(annotator.bindCustomListenersOnThread).to.not.have.been.called;
            expect(annotator.togglePointModeHandler).to.have.been.called;
        });

        it('should create, show, and bind listeners to a thread', () => {
            const thread = {
                show: sandbox.stub()
            };
            sandbox.stub(annotator, '_destroyPendingThreads').returns(false);
            sandbox.stub(annotator, 'getLocationFromEvent').returns({});
            sandbox.stub(annotator, 'createAnnotationThread').returns(thread);
            sandbox.stub(annotator, 'bindCustomListenersOnThread');
            sandbox.stub(annotator, 'togglePointModeHandler');

            annotator.pointClickHandler(event);

            expect(annotator.getLocationFromEvent).to.have.been.called;
            expect(thread.show).to.have.been.called;
            expect(annotator.bindCustomListenersOnThread).to.have.been.called;
            expect(annotator.togglePointModeHandler).to.have.been.called;
        });
    });

    describe('addToThreadMap', () => {
        it('should add thread to the thread map', () => {
            const thread = {
                location: {
                    page: 2
                }
            };
            const thread2 = {
                location: {
                    page: 3
                }
            };
            const thread3 = {
                location: {
                    page: 2
                }
            };

            annotator.init();
            annotator.addThreadToMap(thread);

            expect(annotator._threads).to.deep.equal({
                2: [thread]
            });

            annotator.addThreadToMap(thread2);
            annotator.addThreadToMap(thread3);

            expect(annotator._threads).to.deep.equal({
                2: [thread, thread3],
                3: [thread2]
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

    describe('_destroyPendingThreads', () => {
        it('should destroy and return true if there are any pending threads', () => {
            const thread = {
                location: {
                    page: 2
                },
                state: constants.ANNOTATION_STATE_PENDING,
                destroy: () => {}
            };
            const destroyStub = sandbox.stub(thread, 'destroy');
            annotator.init();
            annotator.addThreadToMap(thread);
            const destroyed = annotator._destroyPendingThreads();

            expect(destroyStub).to.be.called;
            expect(destroyed).to.equal(true);
        });

        it('should not destroy and return false if there are no threads', () => {
            const thread = {
                location: {
                    page: 2
                },
                state: constants.ANNOTATION_STATE_PENDING,
                destroy: () => {}
            };
            const destroyStub = sandbox.stub(thread, 'destroy');
            annotator.init();
            const destroyed = annotator._destroyPendingThreads();

            expect(destroyStub).to.not.be.called;
            expect(destroyed).to.equal(false);
        });

        it('should not destroy and return false if the threads are not pending', () => {
            const thread = {
                location: {
                    page: 2
                },
                state: 'NOT_PENDING',
                destroy: () => {}
            };
            const destroyStub = sandbox.stub(thread, 'destroy');
            annotator.init();
            annotator.addThreadToMap(thread);
            const destroyed = annotator._destroyPendingThreads();

            expect(destroyStub).to.not.be.called;
            expect(destroyed).to.equal(false);
        });

        it('should destroy only pending threads, and return true', () => {
            const thread = {
                location: {
                    page: 2
                },
                state: 'NOT_PENDING',
                destroy: () => {}
            };
            const thread2 = {
                location: {
                    page: 2
                },
                state: constants.ANNOTATION_STATE_PENDING,
                destroy: () => {}
            };
            const destroyStub = sandbox.stub(thread, 'destroy');
            const destroyStub2 = sandbox.stub(thread2, 'destroy');
            annotator.init();
            annotator.addThreadToMap(thread);
            annotator.addThreadToMap(thread2);
            const destroyed = annotator._destroyPendingThreads();

            expect(destroyStub).to.not.be.called;
            expect(destroyStub2).to.be.called;
            expect(destroyed).to.equal(true);
        });
    });
});
