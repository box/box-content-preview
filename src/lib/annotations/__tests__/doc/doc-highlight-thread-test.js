/* eslint-disable no-unused-expressions */
import Browser from '../../../browser';
import DocHighlightDialog from '../../doc/doc-highlight-dialog';
import DocHighlightThread from '../../doc/doc-highlight-thread';
import AnnotationService from '../../annotation-service';
import * as constants from '../../annotation-constants';
import * as annotatorUtil from '../../annotator-util';
import * as docAnnotatorUtil from '../../doc/doc-annotator-util';


let highlightThread;
const sandbox = sinon.sandbox.create();

describe('doc-highlight-thread', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/__tests__/doc/doc-highlight-thread-test.html');

        highlightThread = new DocHighlightThread({
            annotatedElement: document.querySelector('.annotated-element'),
            annotations: [],
            annotationService: new AnnotationService({
                api: 'https://app.box.com/api',
                fileID: 1,
                token: 'someToken',
                canAnnotate: true
            }),
            fileVersionID: 1,
            location: {},
            threadID: 2,
            type: 'highlight'
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('cancelFirstComment()', () => {
        it('should switch dialogs when cancelling the first comment on an existing plain highlight', () => {
            // Adding a plain highlight annotation to the thread
            sandbox.stub(highlightThread._annotationService, 'create').returns(Promise.resolve({}));
            sandbox.stub(highlightThread._dialog, 'position');
            highlightThread.saveAnnotation('highlight', '');

            // Cancel first comment on existing annotation
            sandbox.stub(highlightThread._dialog, 'toggleHighlightDialogs');
            sandbox.stub(highlightThread, 'reset');
            highlightThread.cancelFirstComment();

            expect(highlightThread._dialog.toggleHighlightDialogs).to.have.been.called;
            expect(highlightThread.reset).to.have.been.called;

            // only plain highlight annotation should still exist
            expect(highlightThread._annotations.length).to.equal(1);

            // comment textarea should be cleared
            const annotationTextEl = highlightThread._annotatedElement.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
            expect(annotationTextEl.value).to.equal('');
        });

        it('should destroy the annotation when cancelling a new highlight comment annotation', () => {
            // Cancel first comment on existing annotation
            sandbox.stub(highlightThread, 'destroy');
            highlightThread.cancelFirstComment();

            expect(highlightThread.destroy).to.have.been.called;
            assert.equal(highlightThread._element, null);
        });
    });

    describe('destroy()', () => {
        it('should destroy the thread', () => {
            highlightThread._state = constants.ANNOTATION_STATE_ACTIVE;

            // This stubs out a parent method by forcing the method we care about
            // in the prototype of the prototype of DocHighlightThread (ie
            // AnnotationThread's prototype) to be a stub
            Object.defineProperty(Object.getPrototypeOf(DocHighlightThread.prototype), 'destroy', {
                value: sandbox.stub()
            });

            highlightThread.destroy();

            assert.equal(highlightThread._element, null);
        });
    });

    describe('hide()', () => {
        it('should erase highlight thread from the UI', () => {
            sandbox.stub(highlightThread, '_draw');

            highlightThread.hide();

            expect(highlightThread._draw).to.have.been.called;
        });
    });

    describe('reset()', () => {
        it('should set highlight to inactive and redraw', () => {
            sandbox.stub(highlightThread, 'show');

            highlightThread.reset();

            expect(highlightThread.show).to.have.been.called;
            assert.equal(highlightThread._state, constants.ANNOTATION_STATE_INACTIVE);
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

            highlightThread.saveAnnotation(constants.ANNOTATION_TYPE_HIGHLIGHT, '');

            assert.equal(highlightThread._state, constants.ANNOTATION_STATE_HOVER);
        });

        it('should save a highlight comment annotation', () => {
            // This stubs out a parent method by forcing the method we care about
            // in the prototype of the prototype of DocHighlightThread (ie
            // AnnotationThread's prototype) to be a stub
            Object.defineProperty(Object.getPrototypeOf(DocHighlightThread.prototype), 'saveAnnotation', {
                value: sandbox.stub()
            });

            highlightThread.saveAnnotation(constants.ANNOTATION_TYPE_HIGHLIGHT, 'bleh');

            assert.equal(highlightThread._state, constants.ANNOTATION_STATE_HOVER);
        });
    });

    describe('deleteAnnotation()', () => {
        it('should hide the add highlight button if the user does not have permissions', () => {
            const plainHighlightThread = new DocHighlightThread({
                annotatedElement: document.querySelector('.annotated-element'),
                annotations: [
                    { permissions: { can_delete: false } }
                ],
                annotationService: new AnnotationService({
                    api: 'https://app.box.com/api',
                    fileID: 1,
                    token: 'someToken',
                    canAnnotate: true
                }),
                fileVersionID: 1,
                location: {},
                threadID: 2,
                type: 'highlight'
            });

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
                annotations: [
                    { permissions: { can_delete: true } }
                ],
                annotationService: new AnnotationService({
                    api: 'https://app.box.com/api',
                    fileID: 1,
                    token: 'someToken',
                    canAnnotate: true
                }),
                fileVersionID: 1,
                location: {},
                threadID: 2,
                type: 'highlight'
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
            highlightThread._state = constants.ANNOTATION_STATE_PENDING;

            sandbox.stub(highlightThread, 'destroy');

            highlightThread.onMousedown();

            expect(highlightThread.destroy).to.have.been.called;
        });
    });

    describe('onClick()', () => {
        it('should return false if event was from a mobile device and thread does not have comments', () => {
            highlightThread._type = constants.ANNOTATION_TYPE_HIGHLIGHT;
            sandbox.stub(Browser, 'isMobile').returns(true);

            const isHighlightPending = highlightThread.onClick({}, false);

            expect(isHighlightPending).to.be.false;
        });

        it('should return true if event was from a mobile device and thread has comments', () => {
            highlightThread._state = constants.ANNOTATION_STATE_HOVER;
            highlightThread._type = constants.ANNOTATION_TYPE_HIGHLIGHT_COMMENT;
            sandbox.stub(Browser, 'isMobile').returns(true);

            const isHighlightPending = highlightThread.onClick({}, false);

            expect(isHighlightPending).to.be.true;
        });

        it('should set annotation to inactive if event has already been consumed', () => {
            highlightThread._state = constants.ANNOTATION_STATE_HOVER;
            highlightThread._type = constants.ANNOTATION_TYPE_HIGHLIGHT_COMMENT;
            sandbox.stub(Browser, 'isMobile').returns(false);

            const isHighlightPending = highlightThread.onClick({}, true);

            expect(isHighlightPending).to.be.false;
            expect(highlightThread._state).to.equal(constants.ANNOTATION_STATE_INACTIVE);
        });

        it('should set annotation to active if highlight is in the hover state', () => {
            highlightThread._state = constants.ANNOTATION_STATE_HOVER;
            highlightThread._type = constants.ANNOTATION_TYPE_HIGHLIGHT_COMMENT;
            sandbox.stub(Browser, 'isMobile').returns(false);
            sandbox.stub(highlightThread, 'reset');

            const isHighlightPending = highlightThread.onClick({}, false);

            expect(isHighlightPending).to.be.true;
            expect(highlightThread.reset).to.not.have.been.called;
            expect(highlightThread._state).to.equal(constants.ANNOTATION_STATE_ACTIVE);
        });

        it('should set annotation to active if highlight is in the active hover state', () => {
            highlightThread._state = constants.ANNOTATION_STATE_ACTIVE_HOVER;
            highlightThread._type = constants.ANNOTATION_TYPE_HIGHLIGHT_COMMENT;
            sandbox.stub(Browser, 'isMobile').returns(false);
            sandbox.stub(highlightThread, 'reset');

            const isHighlightPending = highlightThread.onClick({}, false);

            expect(isHighlightPending).to.be.true;
            expect(highlightThread.reset).to.not.have.been.called;
            expect(highlightThread._state).to.equal(constants.ANNOTATION_STATE_ACTIVE);
        });

        it('should set annotation to active if mouse is hovering over highlight or dialog', () => {
            highlightThread._state = constants.ANNOTATION_STATE_PENDING;
            highlightThread._type = constants.ANNOTATION_TYPE_HIGHLIGHT_COMMENT;
            sandbox.stub(Browser, 'isMobile').returns(false);
            sandbox.stub(highlightThread, 'isOnHighlight').returns(true);
            sandbox.stub(highlightThread, 'reset');

            const isHighlightPending = highlightThread.onClick({}, false);

            expect(isHighlightPending).to.be.true;
            expect(highlightThread.reset).to.not.have.been.called;
            expect(highlightThread._state).to.equal(constants.ANNOTATION_STATE_ACTIVE);
        });
    });

    describe('isOnHighlight()', () => {
        it('should return true if mouse event is over highlight', () => {
            sandbox.stub(highlightThread, '_isInHighlight').returns(true);

            const result = highlightThread.isOnHighlight({});

            expect(result).to.be.true;
        });

        it('should return true if mouse event is over highlight dialog', () => {
            sandbox.stub(highlightThread, '_isInHighlight').returns(false);
            sandbox.stub(docAnnotatorUtil, 'isInDialog').returns(true);

            const result = highlightThread.isOnHighlight({});

            expect(result).to.be.true;
        });

        it('should return false if mouse event is neither over the highlight or the dialog', () => {
            sandbox.stub(highlightThread, '_isInHighlight').returns(false);
            sandbox.stub(docAnnotatorUtil, 'isInDialog').returns(false);

            const result = highlightThread.isOnHighlight({});

            expect(result).to.be.false;
        });
    });

    describe('activateDialog()', () => {
        it('should set to active-hover and trigger dialog mouseenter event if thread is in the active state', () => {
            sandbox.stub(docAnnotatorUtil, 'isInDialog').returns(true);
            sandbox.stub(highlightThread._dialog, 'mouseenterHandler');
            highlightThread._state = constants.ANNOTATION_STATE_ACTIVE;

            highlightThread.activateDialog();

            assert.equal(highlightThread._state, constants.ANNOTATION_STATE_ACTIVE_HOVER);
            expect(highlightThread._dialog.mouseenterHandler).to.have.been.called;
        });

        it('should set to active-hover and trigger dialog mouseenter event if thread is in the active-hover state', () => {
            sandbox.stub(docAnnotatorUtil, 'isInDialog').returns(true);
            sandbox.stub(highlightThread._dialog, 'mouseenterHandler');
            highlightThread._state = constants.ANNOTATION_STATE_ACTIVE_HOVER;

            highlightThread.activateDialog();

            assert.equal(highlightThread._state, constants.ANNOTATION_STATE_ACTIVE_HOVER);
            expect(highlightThread._dialog.mouseenterHandler).to.have.been.called;
        });

        it('should set to hover and trigger dialog mouseenter event if thread is not in the active or active-hover state', () => {
            sandbox.stub(docAnnotatorUtil, 'isInDialog').returns(true);
            sandbox.stub(highlightThread._dialog, 'mouseenterHandler');
            highlightThread._state = constants.ANNOTATION_STATE_INACTIVE;

            highlightThread.activateDialog();

            assert.equal(highlightThread._state, constants.ANNOTATION_STATE_HOVER);
            expect(highlightThread._dialog.mouseenterHandler).to.have.been.called;
        });
    });

    describe('onMousemove()', () => {
        it('should delay drawing highlight if mouse is hovering over a highlight dialog and not pending comment', () => {
            sandbox.stub(highlightThread, '_getPageEl').returns(highlightThread._annotatedElement);
            sandbox.stub(docAnnotatorUtil, 'isInDialog').returns(true);
            highlightThread._state = constants.ANNOTATION_STATE_INACTIVE;

            const result = highlightThread.onMousemove({});

            expect(result).to.be.true;
            expect(highlightThread._state).to.equal(constants.ANNOTATION_STATE_HOVER);
        });

        it('should do nothing if mouse is hovering over a highlight dialog and pending comment', () => {
            sandbox.stub(highlightThread, '_getPageEl').returns(highlightThread._annotatedElement);
            sandbox.stub(docAnnotatorUtil, 'isInDialog').returns(true);
            sandbox.stub(highlightThread, 'activateDialog');
            highlightThread._state = constants.ANNOTATION_STATE_PENDING_ACTIVE;

            const result = highlightThread.onMousemove({});

            expect(highlightThread.activateDialog).to.not.have.been.called;
            expect(result).to.be.false;
        });

        it('should not delay drawing highlight if a different dialog is currently active', () => {
            sandbox.stub(highlightThread, '_getPageEl').returns(highlightThread._annotatedElement);
            sandbox.stub(docAnnotatorUtil, 'isInDialog').returns(false);
            sandbox.stub(highlightThread, 'hideDialog');
            sandbox.stub(docAnnotatorUtil, 'hasActiveDialog').returns(true);

            const result = highlightThread.onMousemove({});

            expect(highlightThread.hideDialog).to.have.been.called;
            expect(result).to.be.false;
        });

        it('should delay drawing highlight if mouse is hovering over a highlight', () => {
            sandbox.stub(highlightThread, '_getPageEl').returns(highlightThread._annotatedElement);
            sandbox.stub(docAnnotatorUtil, 'isInDialog').returns(false);
            sandbox.stub(highlightThread, '_isInHighlight').returns(true);
            sandbox.stub(highlightThread, 'activateDialog');
            sandbox.stub(docAnnotatorUtil, 'hasActiveDialog').returns(false);
            highlightThread._state = constants.ANNOTATION_STATE_ACTIVE_HOVER;

            const result = highlightThread.onMousemove({});

            expect(highlightThread.activateDialog).to.have.been.called;
            expect(result).to.be.true;
        });

        it('should delay drawing highlight if mouse is not in highlight previously in the active-hover state', () => {
            sandbox.stub(highlightThread, '_getPageEl').returns(highlightThread._annotatedElement);
            sandbox.stub(docAnnotatorUtil, 'isInDialog').returns(false);
            sandbox.stub(highlightThread, '_isInHighlight').returns(false);
            sandbox.stub(docAnnotatorUtil, 'hasActiveDialog').returns(false);
            highlightThread._state = constants.ANNOTATION_STATE_ACTIVE_HOVER;

            const result = highlightThread.onMousemove({});

            assert.equal(highlightThread._state, constants.ANNOTATION_STATE_ACTIVE);
            expect(result).to.be.true;
        });

        it('should delay drawing highlight if mouse is not in highlight and the state is active', () => {
            sandbox.stub(highlightThread, '_getPageEl').returns(highlightThread._annotatedElement);
            sandbox.stub(docAnnotatorUtil, 'isInDialog').returns(false);
            sandbox.stub(highlightThread, '_isInHighlight').returns(false);
            sandbox.stub(docAnnotatorUtil, 'hasActiveDialog').returns(false);
            highlightThread._state = constants.ANNOTATION_STATE_ACTIVE;

            const result = highlightThread.onMousemove({});

            assert.equal(highlightThread._state, constants.ANNOTATION_STATE_ACTIVE);
            expect(result).to.be.true;
        });

        it('should not delay drawing highlight if mouse is not in highlight and the state is not already inactive', () => {
            sandbox.stub(highlightThread, '_getPageEl').returns(highlightThread._annotatedElement);
            sandbox.stub(docAnnotatorUtil, 'isInDialog').returns(false);
            sandbox.stub(highlightThread, '_isInHighlight').returns(false);
            sandbox.stub(docAnnotatorUtil, 'hasActiveDialog').returns(false);
            highlightThread._state = constants.ANNOTATION_STATE_HOVER;

            const result = highlightThread.onMousemove({});

            expect(highlightThread.hoverTimeoutHandler).to.not.be.undefined;
            expect(result).to.be.false;
        });

        it('should not delay drawing highlight if the state is already inactive', () => {
            sandbox.stub(highlightThread, '_getPageEl').returns(highlightThread._annotatedElement);
            sandbox.stub(docAnnotatorUtil, 'isInDialog').returns(false);
            sandbox.stub(highlightThread, '_isInHighlight').returns(false);
            sandbox.stub(docAnnotatorUtil, 'hasActiveDialog').returns(false);
            highlightThread._state = constants.ANNOTATION_STATE_INACTIVE;

            const result = highlightThread.onMousemove({});

            assert.equal(highlightThread._state, constants.ANNOTATION_STATE_INACTIVE);
            expect(result).to.be.false;
        });
    });

    describe('show()', () => {
        it('should show the dialog if the state is pending', () => {
            sandbox.stub(highlightThread, 'showDialog');

            highlightThread._state = constants.ANNOTATION_STATE_PENDING;
            highlightThread.show();

            expect(highlightThread.showDialog).to.have.been.called;
        });

        it('should not show the dialog if the state is inactive and redraw the highlight as not active', () => {
            sandbox.stub(highlightThread, 'hideDialog');
            sandbox.stub(highlightThread, '_draw');

            highlightThread._state = constants.ANNOTATION_STATE_INACTIVE;
            highlightThread.show();

            expect(highlightThread.hideDialog).to.have.been.called;
            expect(highlightThread._draw).to.have.been.calledWith(constants.HIGHLIGHT_NORMAL_FILL_STYLE);
        });

        it('should show the dialog if the state is not pending and redraw the highlight as active', () => {
            sandbox.stub(highlightThread, 'showDialog');
            sandbox.stub(highlightThread, '_draw');

            highlightThread._state = constants.ANNOTATION_STATE_HOVER;
            highlightThread.show();

            expect(highlightThread.showDialog).to.have.been.called;
            expect(highlightThread._draw).to.have.been.calledWith(constants.HIGHLIGHT_ACTIVE_FILL_STYLE);
        });
    });

    describe('createDialog()', () => {
        it('should initialize an appropriate dialog', () => {
            highlightThread.createDialog();
            expect(highlightThread._dialog instanceof DocHighlightDialog).to.be.true;
        });
    });

    describe('bindCustomListenersOnDialog()', () => {
        it('should bind custom listeners on dialog', () => {
            highlightThread._dialog = {
                addListener: () => {}
            };

            const addListenerStub = sandbox.stub(highlightThread._dialog, 'addListener');

            highlightThread.bindCustomListenersOnDialog();

            expect(addListenerStub).to.have.been.calledWith('annotationdraw', sinon.match.func);
            expect(addListenerStub).to.have.been.calledWith('annotationcreate', sinon.match.func);
            expect(addListenerStub).to.have.been.calledWith('annotationcancel', sinon.match.func);
            expect(addListenerStub).to.have.been.calledWith('annotationdelete', sinon.match.func);
        });
    });

    describe('_isInHighlight()', () => {
        it('should not scale points if there is no dimensionScale', () => {
            const pageEl = {
                getBoundingClientRect: sandbox.stub()
            };
            pageEl.getBoundingClientRect.returns({ height: 0, top: 10 });
            const pageElStub = sandbox.stub(highlightThread, '_getPageEl').returns(pageEl);
            const dimensionScaleStub = sandbox.stub(docAnnotatorUtil, 'getDimensionScale').returns(false);
            const quadPoint = {
                map: sandbox.stub()
            };
            highlightThread._location.quadPoints = [quadPoint, quadPoint, quadPoint];
            const convertStub = sandbox.stub(docAnnotatorUtil, 'convertPDFSpaceToDOMSpace').returns([0, 0, 0, 0, 0, 0, 0, 0]);

            highlightThread._isInHighlight({ clientX: 0, clientY: 0 });
            expect(pageElStub).to.be.called;
            expect(pageEl.getBoundingClientRect).to.be.called;
            expect(dimensionScaleStub).to.be.called;
            expect(quadPoint.map).to.not.be.called;
            expect(convertStub).to.be.called;
        });

        it('should scale points if there is a dimensionScale', () => {
            const pageEl = {
                getBoundingClientRect: sandbox.stub()
            };
            pageEl.getBoundingClientRect.returns({ height: 0, top: 10 });
            const pageElStub = sandbox.stub(highlightThread, '_getPageEl').returns(pageEl);
            const dimensionScaleStub = sandbox.stub(docAnnotatorUtil, 'getDimensionScale').returns(true);
            const quadPoint = {
                map: sandbox.stub()
            };
            highlightThread._location.quadPoints = [quadPoint, quadPoint, quadPoint];
            const convertStub = sandbox.stub(docAnnotatorUtil, 'convertPDFSpaceToDOMSpace').returns([0, 0, 0, 0, 0, 0, 0, 0]);

            highlightThread._isInHighlight({ clientX: 0, clientY: 0 });
            expect(pageElStub).to.be.called;
            expect(pageEl.getBoundingClientRect).to.be.called;
            expect(dimensionScaleStub).to.be.called;
            expect(quadPoint.map).to.be.called;
            expect(convertStub).to.be.called;
        });

        it('get the quad points and return if the point isInPolyOpt', () => {
            const pageEl = {
                getBoundingClientRect: sandbox.stub()
            };
            pageEl.getBoundingClientRect.returns({ height: 0, top: 10 });
            const pageElStub = sandbox.stub(highlightThread, '_getPageEl').returns(pageEl);
            const dimensionScaleStub = sandbox.stub(docAnnotatorUtil, 'getDimensionScale').returns(false);
            const quadPoint = {
                map: sandbox.stub()
            };
            highlightThread._location.quadPoints = [quadPoint, quadPoint, quadPoint];
            const convertStub = sandbox.stub(docAnnotatorUtil, 'convertPDFSpaceToDOMSpace').returns([0, 0, 0, 0, 0, 0, 0, 0]);
            const pointInPolyStub = sandbox.stub(docAnnotatorUtil, 'isPointInPolyOpt');

            highlightThread._isInHighlight({ clientX: 0, clientY: 0 });
            expect(pageElStub).to.be.called;
            expect(pageEl.getBoundingClientRect).to.be.called;
            expect(dimensionScaleStub).to.be.called;
            expect(quadPoint.map).to.not.be.called;
            expect(convertStub).to.be.called;
            expect(pointInPolyStub).to.be.called;
        });
    });

    describe('_getPageEl()', () => {
        it('should return the result of querySelector', () => {
            const queryStub = sandbox.stub(highlightThread._annotatedElement, 'querySelector');

            highlightThread._getPageEl();
            expect(queryStub).to.be.called;
        });
    });

    describe('_getContext()', () => {
        it('should return null if there is no pageEl', () => {
            const pageElStub = sandbox.stub(highlightThread, '_getPageEl').returns(false);
            const result = highlightThread._getContext();

            expect(pageElStub).to.be.called;
            expect(result).to.equal(null);
        });

        it('should not insert the pageEl if the annotationLayerEl already exists', () => {
            const pageEl = {
                querySelector: sandbox.stub(),
                getBoundingClientRect: sandbox.stub(),
                insertBefore: sandbox.stub()
            };
            const annotationLayer = {
                width: 0,
                height: 0,
                getContext: sandbox.stub()
            };
            const pageElStub = sandbox.stub(highlightThread, '_getPageEl').returns(pageEl);
            pageEl.querySelector.returns(annotationLayer);
            annotationLayer.getContext.returns('2d context');

            highlightThread._getContext();
            expect(pageElStub).to.be.called;
            expect(annotationLayer.getContext).to.be.called;
            expect(pageEl.insertBefore).to.not.be.called;
        });

        it('should insert the pageEl if the annotationLayerEl does not exist', () => {
            const pageEl = {
                querySelector: sandbox.stub(),
                getBoundingClientRect: sandbox.stub(),
                insertBefore: sandbox.stub()
            };
            const annotationLayer = {
                width: 0,
                height: 0,
                getContext: sandbox.stub(),
                classList: {
                    add: sandbox.stub()
                }
            };
            const pageElStub = sandbox.stub(highlightThread, '_getPageEl').returns(pageEl);
            pageEl.querySelector.returns(undefined);
            const docStub = sandbox.stub(document, 'createElement').returns(annotationLayer);
            annotationLayer.getContext.returns('2d context');
            pageEl.getBoundingClientRect.returns({ width: 0, height: 0 });

            highlightThread._getContext();
            expect(pageElStub).to.be.called;
            expect(docStub).to.be.called;
            expect(annotationLayer.getContext).to.be.called;
            expect(pageEl.insertBefore).to.be.called;
        });
    });
});
