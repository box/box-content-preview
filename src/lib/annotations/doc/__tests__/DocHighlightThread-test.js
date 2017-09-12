/* eslint-disable no-unused-expressions */
import DocHighlightDialog from '../DocHighlightDialog';
import DocHighlightThread from '../DocHighlightThread';
import AnnotationService from '../../AnnotationService';
import * as annotatorUtil from '../../annotatorUtil';
import * as docAnnotatorUtil from '../docAnnotatorUtil';
import {
    STATES,
    TYPES,
    HIGHLIGHT_FILL,
} from '../../annotationConstants';

let highlightThread;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/doc/DocHighlightThread', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/doc/__tests__/DocHighlightThread-test.html');

        highlightThread = new DocHighlightThread({
            annotatedElement: document.querySelector('.annotated-element'),
            annotations: [],
            annotationService: new AnnotationService({
                apiHost: 'https://app.box.com/api',
                fileId: 1,
                token: 'someToken',
                canAnnotate: true
            }),
            fileVersionId: 1,
            location: {},
            threadID: 2,
            type: 'highlight',
            permissions: {
                canAnnotate: true,
                canViewAllAnnotations: true
            }
        });
        highlightThread.dialog.setup([]);
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        if (typeof highlightThread.destroy === 'function') {
            highlightThread.destroy();
            highlightThread = null;
        }
    });

    describe('cancelFirstComment()', () => {
        it('should switch dialogs when cancelling the first comment on an existing plain highlight', () => {
            // Adding a plain highlight annotation to the thread
            sandbox.stub(highlightThread.annotationService, 'create').returns(Promise.resolve({}));
            sandbox.stub(highlightThread.dialog, 'position');
            highlightThread.saveAnnotation('highlight', '');

            // Cancel first comment on existing annotation
            sandbox.stub(highlightThread.dialog, 'toggleHighlightDialogs');
            sandbox.stub(highlightThread, 'reset');
            highlightThread.cancelFirstComment();

            expect(highlightThread.dialog.toggleHighlightDialogs).to.be.called;
            expect(highlightThread.reset).to.be.called;

            // only plain highlight annotation should still exist
            expect(highlightThread.annotations.length).to.equal(1);
        });

        it('should destroy the annotation when cancelling a new highlight comment annotation', () => {
            // Cancel first comment on existing annotation
            sandbox.stub(highlightThread, 'destroy');
            highlightThread.cancelFirstComment();

            expect(highlightThread.destroy).to.be.called;
            assert.equal(highlightThread.element, null);
        });

        it('should reset the thread if on mobile and a comment-highlight', () => {
            sandbox.stub(highlightThread, 'reset');
            highlightThread.annotations = [{}, {}, {}];
            highlightThread.isMobile = true;

            highlightThread.cancelFirstComment();

            expect(highlightThread.reset).to.be.called;
        });
    });

    describe('destroy()', () => {
        it('should destroy the thread', () => {
            highlightThread.state = STATES.pending;

            // This stubs out a parent method by forcing the method we care about
            // in the prototype of the prototype of DocHighlightThread (ie
            // AnnotationThread's prototype) to be a stub
            Object.defineProperty(Object.getPrototypeOf(DocHighlightThread.prototype), 'destroy', {
                value: sandbox.stub()
            });

            highlightThread.destroy();

            assert.equal(highlightThread.element, null);
        });
    });

    describe('hide()', () => {
        it('should erase highlight thread from the UI', () => {
            sandbox.stub(highlightThread, 'draw');

            highlightThread.hide();

            expect(highlightThread.draw).to.be.called;
        });
    });

    describe('reset()', () => {
        it('should set highlight to inactive and redraw', () => {
            sandbox.stub(highlightThread, 'show');

            highlightThread.reset();

            expect(highlightThread.show).to.be.called;
            assert.equal(highlightThread.state, STATES.inactive);
        });
    });

    describe('saveAnnotation()', () => {
        it('should save a plain highlight annotation', () => {
            // This stubs out a parent method by forcing the method we care about
            // in the prototype of the prototype of DocHighlightThread (ie
            // AnnotationThread's prototype) to be a stub
            Object.defineProperty(Object.getPrototypeOf(DocHighlightThread.prototype), 'saveAnnotation', {
                value: sandbox.stub()
            });

            highlightThread.saveAnnotation(TYPES.highlight, '');
        });

        it('should save a highlight comment annotation', () => {
            // This stubs out a parent method by forcing the method we care about
            // in the prototype of the prototype of DocHighlightThread (ie
            // AnnotationThread's prototype) to be a stub
            Object.defineProperty(Object.getPrototypeOf(DocHighlightThread.prototype), 'saveAnnotation', {
                value: sandbox.stub()
            });

            highlightThread.saveAnnotation(TYPES.highlight, 'bleh');
        });
    });

    describe('deleteAnnotation()', () => {
        it('should hide the add highlight button if the user does not have permissions', () => {
            const plainHighlightThread = new DocHighlightThread({
                annotatedElement: document.querySelector('.annotated-element'),
                annotations: [{ permissions: { can_delete: false } }],
                annotationService: new AnnotationService({
                    apiHost: 'https://app.box.com/api',
                    fileId: 1,
                    token: 'someToken',
                    canAnnotate: true
                }),
                fileVersionId: 1,
                location: {},
                threadID: 2,
                type: 'highlight',
                permissions: {
                    canAnnotate: true,
                    canViewAllAnnotations: true
                }
            });
            plainHighlightThread.dialog.setup([]);

            Object.defineProperty(Object.getPrototypeOf(DocHighlightThread.prototype), 'deleteAnnotation', {
                value: sandbox.stub()
            });
            sandbox.stub(annotatorUtil, 'hideElement');

            plainHighlightThread.deleteAnnotation(1);

            expect(annotatorUtil.hideElement).to.be.called;
        });

        it('should display the add highlight button if the user has permissions', () => {
            const plainHighlightThread = new DocHighlightThread({
                annotatedElement: document.querySelector('.annotated-element'),
                annotations: [{ permissions: { can_delete: true } }],
                annotationService: new AnnotationService({
                    apiHost: 'https://app.box.com/api',
                    fileId: 1,
                    token: 'someToken',
                    canAnnotate: true
                }),
                fileVersionId: 1,
                location: {},
                threadID: 2,
                type: 'highlight',
                permissions: {
                    canAnnotate: true,
                    canViewAllAnnotations: true
                }
            });

            Object.defineProperty(Object.getPrototypeOf(DocHighlightThread.prototype), 'deleteAnnotation', {
                value: sandbox.stub()
            });
            sandbox.stub(annotatorUtil, 'hideElement');

            plainHighlightThread.deleteAnnotation(1);

            expect(annotatorUtil.hideElement).to.not.be.called;
        });
    });

    describe('onMousedown()', () => {
        it('should destroy the thread when annotation is in pending state', () => {
            highlightThread.state = STATES.pending;

            sandbox.stub(highlightThread, 'destroy');

            highlightThread.onMousedown();

            expect(highlightThread.destroy).to.be.called;
        });
    });

    describe('onClick()', () => {
        it('should set annotation to inactive if event has already been consumed', () => {
            highlightThread.state = STATES.hover;
            highlightThread.type = TYPES.highlight_comment;

            const isHighlightPending = highlightThread.onClick({}, true);

            expect(isHighlightPending).to.be.false;
            expect(highlightThread.state).to.equal(STATES.inactive);
        });

        it('should set annotation to hover if mouse is hovering over highlight or dialog', () => {
            highlightThread.state = STATES.pending;
            highlightThread.type = TYPES.highlight_comment;
            sandbox.stub(highlightThread, 'isOnHighlight').returns(true);
            sandbox.stub(highlightThread, 'reset');

            const isHighlightPending = highlightThread.onClick({}, false);

            expect(isHighlightPending).to.be.true;
            expect(highlightThread.reset).to.not.be.called;
            expect(highlightThread.state).to.equal(STATES.hover);
        });
    });

    describe('isOnHighlight()', () => {
        it('should return true if mouse event is over highlight', () => {
            sandbox.stub(highlightThread, 'isInHighlight').returns(true);

            const result = highlightThread.isOnHighlight({});

            expect(result).to.be.true;
        });

        it('should return true if mouse event is over highlight dialog', () => {
            sandbox.stub(highlightThread, 'isInHighlight').returns(false);
            sandbox.stub(annotatorUtil, 'isInDialog').returns(true);

            const result = highlightThread.isOnHighlight({});

            expect(result).to.be.true;
        });

        it('should return false if mouse event is neither over the highlight or the dialog', () => {
            sandbox.stub(highlightThread, 'isInHighlight').returns(false);
            sandbox.stub(annotatorUtil, 'isInDialog').returns(false);

            const result = highlightThread.isOnHighlight({});

            expect(result).to.be.false;
        });
    });

    describe('activateDialog()', () => {
        it('should set to hover and trigger dialog mouseenter event if thread is not in the active or active-hover state', () => {
            sandbox.stub(annotatorUtil, 'isInDialog').returns(true);
            sandbox.stub(highlightThread.dialog, 'mouseenterHandler');
            highlightThread.state = STATES.inactive;

            highlightThread.activateDialog();

            assert.equal(highlightThread.state, STATES.hover);
            expect(highlightThread.dialog.mouseenterHandler).to.be.called;
        });

        it('should ensure element is set up before calling mouse events', () => {
            highlightThread.dialog.element = null;
            sandbox.stub(annotatorUtil, 'isInDialog').returns(true);
            sandbox.stub(highlightThread.dialog, 'setup');
            sandbox.stub(highlightThread.dialog, 'mouseenterHandler');

            highlightThread.activateDialog();
            expect(highlightThread.dialog.setup).to.be.called;
        });
    });

    describe('onMousemove()', () => {
        it('should delay drawing highlight if mouse is hovering over a highlight dialog and not pending comment', () => {
            sandbox.stub(highlightThread, 'getPageEl').returns(highlightThread.annotatedElement);
            sandbox.stub(annotatorUtil, 'isInDialog').returns(true);
            highlightThread.state = STATES.inactive;

            const result = highlightThread.onMousemove({});

            expect(result).to.be.true;
            expect(highlightThread.state).to.equal(STATES.hover);
        });

        it('should do nothing if mouse is hovering over a highlight dialog and pending comment', () => {
            sandbox.stub(highlightThread, 'getPageEl').returns(highlightThread.annotatedElement);
            sandbox.stub(annotatorUtil, 'isInDialog').returns(true);
            sandbox.stub(highlightThread, 'activateDialog');
            highlightThread.state = STATES.pending_active;

            const result = highlightThread.onMousemove({});

            expect(highlightThread.activateDialog).to.not.be.called;
            expect(result).to.be.false;
        });

        it('should delay drawing highlight if mouse is hovering over a highlight', () => {
            sandbox.stub(highlightThread, 'getPageEl').returns(highlightThread.annotatedElement);
            sandbox.stub(annotatorUtil, 'isInDialog').returns(false);
            sandbox.stub(highlightThread, 'isInHighlight').returns(true);
            sandbox.stub(highlightThread, 'activateDialog');
            highlightThread.state = STATES.hover;

            const result = highlightThread.onMousemove({});

            expect(highlightThread.activateDialog).to.be.called;
            expect(result).to.be.true;
        });

        it('should not delay drawing highlight if mouse is not in highlight and the state is not already inactive', () => {
            sandbox.stub(highlightThread, 'getPageEl').returns(highlightThread.annotatedElement);
            sandbox.stub(annotatorUtil, 'isInDialog').returns(false);
            sandbox.stub(highlightThread, 'isInHighlight').returns(false);
            highlightThread.state = STATES.hover;

            const result = highlightThread.onMousemove({});

            expect(highlightThread.hoverTimeoutHandler).to.not.be.undefined;
            expect(result).to.be.false;
        });

        it('should not delay drawing highlight if the state is already inactive', () => {
            sandbox.stub(highlightThread, 'getPageEl').returns(highlightThread.annotatedElement);
            sandbox.stub(annotatorUtil, 'isInDialog').returns(false);
            sandbox.stub(highlightThread, 'isInHighlight').returns(false);
            highlightThread.state = STATES.inactive;

            const result = highlightThread.onMousemove({});

            assert.equal(highlightThread.state, STATES.inactive);
            expect(result).to.be.false;
        });
    });

    describe('show()', () => {
        it('should show the dialog if the state is pending', () => {
            sandbox.stub(highlightThread, 'showDialog');

            highlightThread.state = STATES.pending;
            highlightThread.show();

            expect(highlightThread.showDialog).to.be.called;
        });

        it('should not show the dialog if the state is inactive and redraw the highlight as not active', () => {
            sandbox.stub(highlightThread, 'hideDialog');
            sandbox.stub(highlightThread, 'draw');

            highlightThread.state = STATES.inactive;
            highlightThread.show();

            expect(highlightThread.hideDialog).to.be.called;
            expect(highlightThread.draw).to.be.calledWith(HIGHLIGHT_FILL.normal);
        });

        it('should show the dialog if the state is not pending and redraw the highlight as active', () => {
            sandbox.stub(highlightThread, 'showDialog');
            sandbox.stub(highlightThread, 'draw');

            highlightThread.state = STATES.hover;
            highlightThread.show();

            expect(highlightThread.showDialog).to.be.called;
            expect(highlightThread.draw).to.be.calledWith(HIGHLIGHT_FILL.active);
        });

        it('should do nothing if state is invalid', () => {
            sandbox.stub(highlightThread, 'showDialog');
            sandbox.stub(highlightThread, 'draw');

            highlightThread.state = 'invalid';
            highlightThread.show();

            expect(highlightThread.showDialog).to.not.be.called;
            expect(highlightThread.draw).to.not.be.called;
        });
    });

    describe('createDialog()', () => {
        it('should initialize an appropriate dialog', () => {
            highlightThread.createDialog();
            expect(highlightThread.dialog instanceof DocHighlightDialog).to.be.true;
        });
    });

    describe('bindCustomListenersOnDialog()', () => {
        it('should bind custom listeners on dialog', () => {
            highlightThread.dialog = {
                addListener: () => {}
            };

            const addListenerStub = sandbox.stub(highlightThread.dialog, 'addListener');

            highlightThread.bindCustomListenersOnDialog();

            expect(addListenerStub).to.be.calledWith('annotationdraw', sinon.match.func);
            expect(addListenerStub).to.be.calledWith('annotationcommentpending', sinon.match.func);
            expect(addListenerStub).to.be.calledWith('annotationcreate', sinon.match.func);
            expect(addListenerStub).to.be.calledWith('annotationcancel', sinon.match.func);
            expect(addListenerStub).to.be.calledWith('annotationdelete', sinon.match.func);
        });
    });

    describe('unbindCustomListenersOnDialog()', () => {
        it('should unbind custom listeners on dialog', () => {
            highlightThread.dialog = {
                removeAllListeners: () => {}
            };

            const removeAllListenersStub = sandbox.stub(highlightThread.dialog, 'removeAllListeners');

            highlightThread.unbindCustomListenersOnDialog();

            expect(removeAllListenersStub).to.be.calledWith('annotationdraw');
            expect(removeAllListenersStub).to.be.calledWith('annotationcommentpending');
            expect(removeAllListenersStub).to.be.calledWith('annotationcreate');
            expect(removeAllListenersStub).to.be.calledWith('annotationcancel');
            expect(removeAllListenersStub).to.be.calledWith('annotationdelete');
        });
    });

    describe('draw()', () => {
        it('should not draw if no context exists', () => {
            sandbox.stub(highlightThread, 'getPageEl');
            sandbox.stub(docAnnotatorUtil, 'getContext').returns(null);
            sandbox.stub(annotatorUtil, 'getScale');

            highlightThread.draw('fill');
            expect(highlightThread.pageEl).to.be.undefined;
            expect(annotatorUtil.getScale).to.not.be.called;
        });
    });

    describe('isInHighlight()', () => {
        it('should not scale points if there is no dimensionScale', () => {
            const pageEl = {
                getBoundingClientRect: sandbox.stub()
            };
            pageEl.getBoundingClientRect.returns({ height: 0, top: 10 });
            const pageElStub = sandbox.stub(highlightThread, 'getPageEl').returns(pageEl);
            const dimensionScaleStub = sandbox.stub(annotatorUtil, 'getDimensionScale').returns(false);
            const quadPoint = {};
            highlightThread.location.quadPoints = [quadPoint, quadPoint, quadPoint];
            const convertStub = sandbox
                .stub(docAnnotatorUtil, 'convertPDFSpaceToDOMSpace')
                .returns([0, 0, 0, 0, 0, 0, 0, 0]);

            highlightThread.isInHighlight({ clientX: 0, clientY: 0 });
            expect(pageElStub).to.be.called;
            expect(pageEl.getBoundingClientRect).to.be.called;
            expect(dimensionScaleStub).to.be.called;
            expect(convertStub).to.be.called;
        });

        it('should scale points if there is a dimensionScale', () => {
            const pageEl = {
                getBoundingClientRect: sandbox.stub()
            };
            pageEl.getBoundingClientRect.returns({ height: 0, top: 10 });
            const pageElStub = sandbox.stub(highlightThread, 'getPageEl').returns(pageEl);
            const dimensionScaleStub = sandbox.stub(annotatorUtil, 'getDimensionScale').returns(true);
            const quadPoint = {};
            highlightThread.location.quadPoints = [quadPoint, quadPoint, quadPoint];
            const convertStub = sandbox
                .stub(docAnnotatorUtil, 'convertPDFSpaceToDOMSpace')
                .returns([0, 0, 0, 0, 0, 0, 0, 0]);

            highlightThread.isInHighlight({ clientX: 0, clientY: 0 });
            expect(pageElStub).to.be.called;
            expect(pageEl.getBoundingClientRect).to.be.called;
            expect(dimensionScaleStub).to.be.called;
            expect(convertStub).to.be.called;
        });

        it('get the quad points and return if the point isInPolyOpt', () => {
            const pageEl = {
                getBoundingClientRect: sandbox.stub()
            };
            pageEl.getBoundingClientRect.returns({ height: 0, top: 10 });
            const pageElStub = sandbox.stub(highlightThread, 'getPageEl').returns(pageEl);
            const dimensionScaleStub = sandbox.stub(annotatorUtil, 'getDimensionScale').returns(false);
            const quadPoint = {};
            highlightThread.location.quadPoints = [quadPoint, quadPoint, quadPoint];
            const convertStub = sandbox
                .stub(docAnnotatorUtil, 'convertPDFSpaceToDOMSpace')
                .returns([0, 0, 0, 0, 0, 0, 0, 0]);
            const pointInPolyStub = sandbox.stub(docAnnotatorUtil, 'isPointInPolyOpt');

            highlightThread.isInHighlight({ clientX: 0, clientY: 0 });
            expect(pageElStub).to.be.called;
            expect(pageEl.getBoundingClientRect).to.be.called;
            expect(dimensionScaleStub).to.be.called;
            expect(convertStub).to.be.called;
            expect(pointInPolyStub).to.be.called;
        });
    });
});
