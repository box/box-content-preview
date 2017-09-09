/* eslint-disable no-unused-expressions */
import CreateHighlightDialog, { CreateEvents } from '../CreateHighlightDialog';
import {
    CLASS_ADD_HIGHLIGHT_BTN,
    CLASS_ADD_HIGHLIGHT_COMMENT_BTN,
    CLASS_ANNOTATION_CARET,
    CLASS_HIDDEN
} from '../../annotationConstants';
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

    describe('contructor()', () => {
        it('should default to enable highlights and comments if no config passed in', () => {
            const instance = new CreateHighlightDialog(document.createElement('div'));
            expect(instance.allowHighlight).to.be.true;
            expect(instance.allowComment).to.be.true;
        });

        it('should take config falsey value to disable highlights and comments, when passed in', () => {
            const config = {
                allowHighlight: 'this will falsey to true',
                allowComment: false
            };
            const instance = new CreateHighlightDialog(document.createElement('div'), config);
            expect(instance.allowHighlight).to.be.true;
            expect(instance.allowComment).to.be.false;
        });
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
            const emit = sandbox.stub(dialog, 'emit');
            dialog.show();
            expect(dialog.containerEl.classList.contains(CLASS_HIDDEN)).to.be.false;
            expect(emit).to.be.calledWith(CreateEvents.init);
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

        it('should do nothing with the comment box if it does not exist', () => {
            const clearComment = sandbox.stub(dialog.commentBox, 'clear');
            dialog.commentBox = null;
            dialog.hide();
            expect(clearComment).to.not.be.called;
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

        it('should remove events that are bound to stopPropagation()', () => {
            const remove = sandbox.stub(dialog.containerEl, 'removeEventListener');
            dialog.destroy();
            expect(remove).to.be.calledWith('click');
            expect(remove).to.be.calledWith('mouseup');
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

        it('should remove out all touch events, if touch enabled', () => {
            dialog.destroy();

            dialog.hasTouch = true;
            dialog.isMobile = true;
            dialog.show(document.createElement('div'));
            const highlightCreateStub = sandbox.stub(dialog.highlightCreateEl, 'removeEventListener');
            const commentCreateStub = sandbox.stub(dialog.commentCreateEl, 'removeEventListener');

            const stubs = [
                {
                    stub: highlightCreateStub,
                    args: ['touchstart', dialog.stopPropagation]
                },
                {
                    stub: highlightCreateStub,
                    args: ['touchend', dialog.onHighlightClick]
                },
                {
                    stub: commentCreateStub,
                    args: ['touchstart', dialog.stopPropagation]
                },
                {
                    stub: commentCreateStub,
                    args: ['touchend', dialog.onCommentClick]
                },
                {
                    stub: sandbox.stub(dialog.containerEl, 'removeEventListener'),
                    args: ['touchend', dialog.stopPropagation]
                }
            ];

            dialog.destroy();

            stubs.forEach((stub) => {
                expect(stub.stub).to.be.calledWith(...stub.args);
            });
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
            dialog.onHighlightClick({ preventDefault: () => {}, stopPropagation: () => {} });
            expect(emit).to.be.calledWith(CreateEvents.plain);
        });
    });

    describe('onCommentClick()', () => {
        beforeEach(() => {
            dialog.show();
        });

        it('should invoke the "comment" highlight event', () => {
            const emit = sandbox.stub(dialog, 'emit');
            dialog.onCommentClick({ preventDefault: () => {}, stopPropagation: () => {} });
            expect(emit).to.be.calledWith(CreateEvents.comment);
        });

        it('should show the comment box', () => {
            const show = sandbox.stub(dialog.commentBox, 'show');
            dialog.onCommentClick({ preventDefault: () => {}, stopPropagation: () => {} });
            expect(show).to.be.called;
        });

        it('should focus on the comment box', () => {
            const focus = sandbox.stub(dialog.commentBox, 'focus');
            dialog.onCommentClick({ preventDefault: () => {}, stopPropagation: () => {} });
            expect(focus).to.be.called;
        });

        it('should hide the highlight buttons', () => {
            const setVis = sandbox.stub(dialog, 'setButtonVisibility');
            dialog.onCommentClick({ preventDefault: () => {}, stopPropagation: () => {} });
            expect(setVis).to.be.called;
        });

        it('should invoke update position', () => {
            const update = sandbox.stub(dialog, 'updatePosition');
            dialog.onCommentClick({ preventDefault: () => {}, stopPropagation: () => {} });
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

        it('should invoke clear() on the comment box', () => {
            const clear = sandbox.stub(dialog.commentBox, 'clear');
            dialog.onCommentPost('A message');
            expect(clear).to.be.called;
        });

        it('should invoke blur() on the comment box', () => {
            const blur = sandbox.stub(dialog.commentBox, 'blur');
            dialog.onCommentPost('A message');
            expect(blur).to.be.called;
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

        it('should create a div with the proper create highlight class', () => {
            let containerEl = dialog.createElement();
            expect(containerEl.nodeName).to.equal('DIV');
            expect(containerEl.classList.contains(CLASS_CREATE_DIALOG)).to.be.true;
        });

        it('should make a reference to the highlight button', () => {
            let containerEl = dialog.createElement();
            expect(dialog.highlightCreateEl).to.exist;
        });

        it('should make a reference to the comment button', () => {
            let containerEl = dialog.createElement();
            expect(dialog.commentCreateEl).to.exist;
        });

        it('should create a comment box', () => {
            let containerEl = dialog.createElement();
            expect(dialog.commentBox).to.be.an.instanceof(CommentBox);
        });

        it('should not create the caret if on a mobile device', () => {
            dialog.isMobile = true;
            let containerEl = dialog.createElement();

            expect(containerEl.querySelector(`.${CLASS_ANNOTATION_CARET}`)).to.not.exist;
        });

        it('should not create a highlight button if highlights are disabled', () => {
            dialog.allowHighlight = false;
            let containerEl = dialog.createElement();

            expect(containerEl.querySelector(`.${CLASS_ADD_HIGHLIGHT_BTN}`)).to.not.exist;
        });

        it('should not create a comment box or button if comments are disabled', () => {
            dialog.allowComment = false;
            let containerEl = dialog.createElement();

            expect(containerEl.querySelector(`.${CLASS_ADD_HIGHLIGHT_COMMENT_BTN}`)).to.not.exist;
            expect(dialog.commentBox).to.not.exist;
        });
    });
});
