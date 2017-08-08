/* eslint-disable no-unused-expressions */
import CreateHighlightDialog, { CreateEvents } from '../CreateHighlightDialog';
import { CLASS_HIDDEN } from '../../annotationConstants';
import CommentBox from '../../CommentBox';
import * as annotatorUtil from '../../annotatorUtil';

const CLASS_CREATE_DIALOG = 'bp-create-annotation-dialog';

describe('lib/annotations/doc/CreateHighlightDialog', () => {
    const sandbox = sinon.sandbox.create();
    let dialog;
    let parentEl;

    beforeEach(() => {
        parentEl = document.createElement('div');
        dialog = new CreateHighlightDialog(parentEl);
    });

    afterEach(() => {
        dialog.destroy();
        dialog = null;
        parentEl = null;
    });

    describe('setParentEl()', () => {
        it('should assign the new parent reference', () => {
            const newParent = document.createElement('span');
            dialog.setParentEl(newParent);
            expect(dialog.parentEl).to.not.deep.equal(parentEl);
            expect(dialog.parentEl).to.deep.equal(newParent);
        });
    });

    describe('setPosition()', () => {
        let update;
        beforeEach(() => {
            update = sandbox.stub(dialog, 'updatePosition');
        });

        it('should set the x and y coordinates to the passed in values', () => {
            const x = 5;
            const y = 6;
            dialog.setPosition(x, y);
            expect(dialog.position.x).to.equal(x);
            expect(dialog.position.y).to.equal(y);
        });

        it('should invoke updatePosition()', () => {
            dialog.setPosition(0, 0);
            expect(update).to.be.called;
        });
    });

    describe('show()', () => {
        it('should invoke createElement() if no UI element has been created', () => {
            const create = sandbox.spy(dialog, 'createElement');
            dialog.show();
            expect(create.called).to.be.true;
        });

        it('should set the parentEl to a new reference, via setParentEl(), if a new one is supplied', () => {
            const set = sandbox.stub(dialog, 'setParentEl');
            const newParent = { name: 'NewParent' };
            dialog.show(newParent);
            expect(set).to.be.calledWith(newParent);
        });

        it('should move the UI element to the parent element if it does not already contain it', () => {
            const append = sandbox.stub(parentEl, 'appendChild');
            dialog.show();
            expect(append).to.be.calledWith(dialog.containerEl);
        });

        it('should invoke setButtonVisibility() to show the highlight buttons', () => {
            const setVis = sandbox.stub(dialog, 'setButtonVisibility');
            dialog.show();
            expect(setVis).to.be.called;
        });

        it('should remove the hidden class from the UI element', () => {
            dialog.show();
            expect(dialog.containerEl.classList.contains(CLASS_HIDDEN)).to.be.false;
        });
    });

    describe('hide()', () => {
        beforeEach(() => {
            dialog.show();
        });
        it('should do nothing if there is no UI element', () => {
            dialog.containerEl = null;
            const hideComment = sandbox.stub(dialog.commentBox, 'hide');
            dialog.hide();
            expect(hideComment).to.not.be.called;
        });

        it('should add the hidden class to the ui element', () => {
            dialog.hide();
            expect(dialog.containerEl.classList.contains(CLASS_HIDDEN)).to.be.true;
        });

        it('should hide the comment box', () => {
            const hideComment = sandbox.stub(dialog.commentBox, 'hide');
            dialog.hide();
            expect(hideComment).to.be.called;
        });

        it('should clear the comment box', () => {
            const clearComment = sandbox.stub(dialog.commentBox, 'clear');
            dialog.hide();
            expect(clearComment).to.be.called;
        });
    });

    describe('destroy()', () => {
        beforeEach(() => {
            dialog.show();
        });

        it('should do nothing if no ui has been created', () => {
            dialog.containerEl = null;
            const hide = sandbox.stub(dialog, 'hide');
            dialog.destroy();
            expect(hide).to.not.be.called;
        });

        it('should remove events that stopPropagation() from occurring outside the dialog', () => {
            const remove = sandbox.stub(dialog.containerEl, 'removeEventListener');
            dialog.destroy();
            expect(remove).to.be.calledWith('click');
            expect(remove).to.be.calledWith('mouseup');
            expect(remove).to.be.calledWith('touchend');
            expect(remove).to.be.calledWith('dblclick');
        });

        it('should remove click event listener from the highlight button', () => {
            const remove = sandbox.stub(dialog.highlightCreateEl, 'removeEventListener');
            dialog.destroy();
            expect(remove).to.be.calledWith('click');
        });

        it('should remove click event listener from the comment button', () => {
            const remove = sandbox.stub(dialog.commentCreateEl, 'removeEventListener');
            dialog.destroy();
            expect(remove).to.be.calledWith('click');
        });

        it('should remove "Post" event listener from the comment box', () => {
            const remove = sandbox.stub(dialog.commentBox, 'removeListener');
            dialog.destroy();
            expect(remove).to.be.calledWith(CommentBox.CommentEvents.post);
        });

        it('should remove "Cancel" event listener from the comment box', () => {
            const remove = sandbox.stub(dialog.commentBox, 'removeListener');
            dialog.destroy();
            expect(remove).to.be.calledWith(CommentBox.CommentEvents.cancel);
        });

        it('should remove the ui element from the dom', () => {
            const remove = sandbox.stub(dialog.containerEl, 'remove');
            dialog.destroy();
            expect(remove).to.be.called;
        });

        it('should destroy the comment box', () => {
            const destroy = sandbox.stub(dialog.commentBox, 'destroy');
            dialog.destroy();
            expect(destroy).to.be.called;
        });
    });

    describe('updatePosition()', () => {
        beforeEach(() => {
            dialog.show();
        });

        it('should update the top of the ui element', () => {
            const y = 50;
            dialog.position.y = y;
            dialog.updatePosition();
            expect(dialog.containerEl.style.top).to.equal(`${y + 5}px`);
        });

        it('should update the left of the ui element, to center it', () => {
            const width = dialog.containerEl.clientWidth;
            const x = 50;
            dialog.position.x = x;
            dialog.updatePosition();
            expect(dialog.containerEl.style.left).to.equal(`${x - 1 - width / 2}px`);
        });
    });

    describe('onHighlightClick()', () => {
        it('should invoke the "plain" highlight event', () => {
            const emit = sandbox.stub(dialog, 'emit');
            dialog.onHighlightClick();
            expect(emit).to.be.calledWith(CreateEvents.plain);
        });
    });

    describe('onCommentClick()', () => {
        beforeEach(() => {
            dialog.show();
        });

        it('should invoke the "comment" highlight event', () => {
            const emit = sandbox.stub(dialog, 'emit');
            dialog.onCommentClick();
            expect(emit).to.be.calledWith(CreateEvents.comment);
        });

        it('should show the comment box', () => {
            const show = sandbox.stub(dialog.commentBox, 'show');
            dialog.onCommentClick();
            expect(show).to.be.called;
        });

        it('should focus on the comment box', () => {
            const focus = sandbox.stub(dialog.commentBox, 'focus');
            dialog.onCommentClick();
            expect(focus).to.be.called;
        });

        it('should hide the highlight buttons', () => {
            const setVis = sandbox.stub(dialog, 'setButtonVisibility');
            dialog.onCommentClick();
            expect(setVis).to.be.called;
        });

        it('should invoke update position', () => {
            const update = sandbox.stub(dialog, 'updatePosition');
            dialog.onCommentClick();
            expect(update).to.be.called;
        });
    });

    describe('onCommentPost()', () => {
        beforeEach(() => {
            dialog.show();
        });

        it('should invoke the "post" event with the string provided', () => {
            const emit = sandbox.stub(dialog, 'emit');
            const text = 'some text';
            dialog.onCommentPost(text);
            expect(emit).to.be.calledWith(CreateEvents.commentPost, text);
        });

        it('should clear the comment box', () => {
            const clear = sandbox.stub(dialog.commentBox, 'clear');
            dialog.onCommentPost();
            expect(clear).to.be.called;
        });
    });

    describe('onCommentCancel()', () => {
        beforeEach(() => {
            dialog.show();
        });

        it('should hide the comment box', () => {
            const hide = sandbox.stub(dialog.commentBox, 'hide');
            dialog.onCommentCancel();
            expect(hide).to.be.called;
        });

        it('should show the highlight buttons', () => {
            const setVis = sandbox.stub(dialog, 'setButtonVisibility');
            dialog.onCommentCancel();
            expect(setVis).to.be.calledWith(true);
        });

        it('should update the position of the dialog', () => {
            const update = sandbox.stub(dialog, 'updatePosition');
            dialog.onCommentCancel();
            expect(update).to.be.called;
        });
    });

    describe('setButtonVisibility()', () => {
        it('should show the buttons if given "true"', () => {
            sandbox.stub(annotatorUtil, 'showElement');
            dialog.setButtonVisibility(true);
            expect(annotatorUtil.showElement).to.be.calledWith(dialog.buttonsEl);
        });

        it('should hide the buttons if given "false"', () => {
            sandbox.stub(annotatorUtil, 'hideElement');
            dialog.setButtonVisibility(false);
            expect(annotatorUtil.hideElement).to.be.calledWith(dialog.buttonsEl);
        });
    });

    describe('stopPropagation()', () => {
        it('should invoke stopPropagation() on the provided event', () => {
            const event = {
                stopPropagation: sandbox.stub()
            };
            dialog.stopPropagation(event);
            expect(event.stopPropagation).to.be.called;
        });
    });

    describe('createElement()', () => {
        let containerEl;

        beforeEach(() => {
            containerEl = dialog.createElement();
        });

        it('should create a div with the proper create highlight class', () => {
            expect(containerEl.nodeName).to.equal('DIV');
            expect(containerEl.classList.contains(CLASS_CREATE_DIALOG)).to.be.true;
        });

        it('should make a reference to the highlight button', () => {
            expect(dialog.highlightCreateEl).to.exist;
        });

        it('should make a reference to the comment button', () => {
            expect(dialog.commentCreateEl).to.exist;
        });

        it('should create a comment box', () => {
            expect(dialog.commentBox).to.be.an.instanceof(CommentBox);
        });
    });
});
