/* eslint-disable no-unused-expressions */
import Browser from '../../../browser';
import DocHighlightDialog from '../../doc/doc-highlight-dialog';
import DocHighlightThread from '../../doc/doc-highlight-thread';
import AnnotationService from '../../annotation-service';
import * as constants from '../../annotation-constants';

let highlightThread;
const sandbox = sinon.sandbox.create();

const HIGHLIGHT_NORMAL_FILL_STYLE = 'rgba(255, 233, 23, 0.35)';
const HIGHLIGHT_ACTIVE_FILL_STYLE = 'rgba(255, 233, 23, 0.5)';

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
            highlightThread.saveAnnotation('highlight', '');

            // Cancel first comment on existing annotation
            sandbox.stub(highlightThread._dialog, 'position');
            sandbox.stub(highlightThread._dialog, 'toggleHighlightDialogs');
            sandbox.stub(highlightThread, 'reset');
            highlightThread.cancelFirstComment();

            expect(highlightThread._dialog.toggleHighlightDialogs).to.have.been.called;
            expect(highlightThread.reset).to.have.been.called;

            // only plain highlight annotation should still exist
            assert.equal(highlightThread._annotations.length, 1);
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

            assert.equal(highlightThread._state, constants.ANNOTATION_STATE_INACTIVE);
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
            sandbox.stub(highlightThread, '_isInDialog').returns(true);

            const result = highlightThread.isOnHighlight({});

            expect(result).to.be.true;
        });

        it('should return false if mouse event is neither over the highlight or the dialog', () => {
            sandbox.stub(highlightThread, '_isInHighlight').returns(false);
            sandbox.stub(highlightThread, '_isInDialog').returns(false);

            const result = highlightThread.isOnHighlight({});

            expect(result).to.be.false;
        });
    });

    describe('onMousemove()', () => {
        it('should not delay drawing highlight if highlight is pending', () => {
            highlightThread._state = constants.ANNOTATION_STATE_PENDING;

            const result = highlightThread.onMousemove({});

            expect(result).to.be.false;
        });

        it('should not delay drawing highlight if a plain highlight is pending a comment', () => {
            highlightThread._state = constants.ANNOTATION_STATE_PENDING_ACTIVE;

            const result = highlightThread.onMousemove({});

            expect(result).to.be.false;
        });

        it('should delay drawing highlight if mouse is hovering over an active highlight or dialog', () => {
            sandbox.stub(highlightThread, 'isOnHighlight').returns(true);
            sandbox.stub(highlightThread._dialog, 'mouseenterHandler');
            highlightThread._state = constants.ANNOTATION_STATE_ACTIVE;

            const result = highlightThread.onMousemove({});

            assert.equal(highlightThread._state, constants.ANNOTATION_STATE_ACTIVE_HOVER);
            expect(highlightThread._dialog.mouseenterHandler).to.have.been.called;
            expect(result).to.be.true;
        });

        it('should delay drawing highlight if mouse is hovering over a highlight or dialog in the active hover state', () => {
            sandbox.stub(highlightThread, 'isOnHighlight').returns(true);
            sandbox.stub(highlightThread._dialog, 'mouseenterHandler');
            highlightThread._state = constants.ANNOTATION_STATE_ACTIVE_HOVER;

            const result = highlightThread.onMousemove({});

            assert.equal(highlightThread._state, constants.ANNOTATION_STATE_ACTIVE_HOVER);
            expect(highlightThread._dialog.mouseenterHandler).to.have.been.called;
            expect(result).to.be.true;
        });

        it('should delay drawing highlight if mouse is not in highlight previously in the active-hover state', () => {
            sandbox.stub(highlightThread, 'isOnHighlight').returns(false);
            highlightThread._state = constants.ANNOTATION_STATE_ACTIVE_HOVER;

            const result = highlightThread.onMousemove({});

            assert.equal(highlightThread._state, constants.ANNOTATION_STATE_ACTIVE);
            expect(result).to.be.true;
        });

        it('should delay drawing highlight if mouse is not in highlight and the state is active', () => {
            sandbox.stub(highlightThread, 'isOnHighlight').returns(false);
            highlightThread._state = constants.ANNOTATION_STATE_ACTIVE;

            const result = highlightThread.onMousemove({});

            assert.equal(highlightThread._state, constants.ANNOTATION_STATE_ACTIVE);
            expect(result).to.be.true;
        });

        it('should not delay drawing highlight if mouse is not in highlight and the state is not already inactive', () => {
            sandbox.stub(highlightThread, 'isOnHighlight').returns(false);
            sandbox.stub(highlightThread, 'reset');
            highlightThread._state = constants.ANNOTATION_STATE_HOVER;

            const result = highlightThread.onMousemove({});

            assert.equal(highlightThread._state, constants.ANNOTATION_STATE_HOVER);
            expect(highlightThread.reset).to.have.been.called;
            expect(result).to.be.false;
        });

        it('should not delay drawing highlight if the state is already inactive', () => {
            sandbox.stub(highlightThread, 'isOnHighlight').returns(false);
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
            expect(highlightThread._draw).to.have.been.calledWith(HIGHLIGHT_NORMAL_FILL_STYLE);
        });

        it('should show the dialog if the state is not pending and redraw the highlight as active', () => {
            sandbox.stub(highlightThread, 'showDialog');
            sandbox.stub(highlightThread, '_draw');

            highlightThread._state = constants.ANNOTATION_STATE_HOVER;
            highlightThread.show();

            expect(highlightThread.showDialog).to.have.been.called;
            expect(highlightThread._draw).to.have.been.calledWith(HIGHLIGHT_ACTIVE_FILL_STYLE);
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
});
