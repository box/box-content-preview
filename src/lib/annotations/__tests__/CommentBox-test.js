/* eslint-disable no-unused-expressions */
import CommentBox from '../CommentBox';
import {
    CLASS_HIDDEN,
    SELECTOR_ANNOTATION_BUTTON_CANCEL,
    SELECTOR_ANNOTATION_BUTTON_POST
} from '../annotationConstants';

describe('lib/annotations/CommentBox', () => {
    const sandbox = sinon.sandbox.create();
    let commentBox;
    let parentEl;

    beforeEach(() => {
        parentEl = document.createElement('span');
        commentBox = new CommentBox(parentEl);
    });

    afterEach(() => {
        commentBox.destroy();
        commentBox = null;
        parentEl = null;
    });

    describe('constructor()', () => {
        let tempCommentBox;
        const config = {
            placeholder: 'some placeholder',
            cancel: 'some cancel',
            post: 'some postage'
        };

        beforeEach(() => {
            tempCommentBox = new CommentBox(parentEl, config);
        });

        afterEach(() => {
            tempCommentBox.destroy();
            tempCommentBox = null;
        });

        it('should assign the parentEl to the container passed in', () => {
            expect(tempCommentBox.parentEl).to.deep.equal(parentEl);
        });

        it('should assign cancelText to the string passed in the config', () => {
            expect(tempCommentBox.cancelText).to.equal(config.cancel);
        });

        it('should assign postText to the string passed in the config', () => {
            expect(tempCommentBox.postText).to.equal(config.post);
        });

        it('should assign placeholderText to the string passed in the config', () => {
            expect(tempCommentBox.placeholderText).to.equal(config.placeholder);
        });
    });

    describe('focus()', () => {
        beforeEach(() => {
            // Kickstart creation of UI
            commentBox.show();
        });

        it('should do nothing if the textarea HTML doesn\'t exist', () => {
            const focus = sandbox.stub(commentBox.textAreaEl, 'focus');

            commentBox.textAreaEl.remove();
            commentBox.textAreaEl = null;

            commentBox.focus();
            expect(focus).to.not.be.called;
        });

        it('should focus on the text area contained by the comment box', () => {
            const focus = sandbox.stub(commentBox.textAreaEl, 'focus');

            commentBox.focus();
            expect(focus).to.be.called;
        });
    });

    describe('clear()', () => {
        beforeEach(() => {
            // Kickstart creation of UI
            commentBox.show();
            sandbox.stub(commentBox, 'preventDefaultAndPropagation');
        });

        it('should overwrite the text area\'s value with an empty string', () => {
            commentBox.textAreaEl.value = 'yay';

            commentBox.clear();
            expect(commentBox.textAreaEl.value).to.equal('');
        });
    });

    describe('hide()', () => {
        beforeEach(() => {
            // Kickstart creation of UI
            commentBox.show();
            sandbox.stub(commentBox, 'preventDefaultAndPropagation');
        });

        it('should do nothing if the comment box HTML doesn\'t exist', () => {
            const addClass = sandbox.stub(commentBox.containerEl.classList, 'add');
            commentBox.containerEl = null;
            commentBox.hide();

            expect(addClass).to.not.be.called;
        });

        it('should add the hidden class to the comment box element', () => {
            commentBox.hide();
            expect(commentBox.containerEl.classList.contains(CLASS_HIDDEN)).to.be.true;
        });
    });

    describe('show()', () => {
        it('should invoke createComment box, if UI has not been created', () => {
            const containerEl = document.createElement('div');
            const create = sandbox.stub(commentBox, 'createCommentBox').returns(containerEl);

            commentBox.show();
            expect(create).to.be.called;
            // Nullify to prevent fail during destroy
            commentBox.containerEl = null;
        });

        it('should add the container element to the parent, if the UI has not been created', () => {
            const append = sandbox.stub(parentEl, 'appendChild');

            commentBox.show();
            expect(append).to.be.calledWith(commentBox.containerEl);
        });

        it('should remove the hidden class from the container', () => {
            commentBox.show();
            expect(commentBox.containerEl.classList.contains(CLASS_HIDDEN)).to.be.false;
        });
    });

    describe('destroy()', () => {
        it('should do nothing if it\'s UI has not been created', () => {
            const unchanged = 'not even the right kind of data';
            commentBox.parentEl = unchanged;
            commentBox.destroy();
            expect(commentBox.parentEl).to.equal(unchanged);
        });

        it('should remove the UI container from the parent element', () => {
            commentBox.show();
            const remove = sandbox.stub(commentBox.containerEl, 'remove');
            commentBox.destroy();
            expect(remove).to.be.called;
        });

        it('should remove event listener from cancel button', () => {
            commentBox.show();
            const remove = sandbox.stub(commentBox.cancelEl, 'removeEventListener');
            commentBox.destroy();
            expect(remove).to.be.called;
        });

        it('should remove event listener from post button', () => {
            commentBox.show();
            const remove = sandbox.stub(commentBox.postEl, 'removeEventListener');
            commentBox.destroy();
            expect(remove).to.be.called;
        });
    });

    describe('createHTML()', () => {
        let el;
        beforeEach(() => {
            el = commentBox.createHTML();
        });

        it('should create and return a section element with bp-create-highlight-comment class on it', () => {
            expect(el.nodeName).to.equal('SECTION');
            expect(el.classList.contains('bp-create-highlight-comment')).to.be.true;
        });

        it('should create a text area with the provided placeholder text', () => {
            expect(el.querySelector('textarea')).to.exist;
        });

        it('should create a cancel button with the provided cancel text', () => {
            expect(el.querySelector(SELECTOR_ANNOTATION_BUTTON_CANCEL)).to.exist;
        });

        it('should create a post button with the provided text', () => {
            expect(el.querySelector(SELECTOR_ANNOTATION_BUTTON_POST)).to.exist;
        });
    });

    describe('onCancel()', () => {
        beforeEach(() => {
            sandbox.stub(commentBox, 'preventDefaultAndPropagation');
        });

        it('should invoke clear()', () => {
            const clear = sandbox.stub(commentBox, 'clear');
            commentBox.onCancel({ preventDefault: () => {} });
            expect(clear).to.be.called;
        });

        it('should emit a cancel event', () => {
            const emit = sandbox.stub(commentBox, 'emit');
            commentBox.onCancel({ preventDefault: () => {} });
            expect(emit).to.be.calledWith(CommentBox.CommentEvents.cancel);
        });
    });

    describe('onPost()', () => {
        beforeEach(() => {
            sandbox.stub(commentBox, 'preventDefaultAndPropagation');
        });

        it('should emit a post event with the value of the text box', () => {
            const emit = sandbox.stub(commentBox, 'emit');
            const text = 'a comment';
            commentBox.textAreaEl = {
                value: text
            };
            commentBox.onPost({ preventDefault: () => {} });
            expect(emit).to.be.calledWith(CommentBox.CommentEvents.post, text);
        });

        it('should invoke clear()', () => {
            const clear = sandbox.stub(commentBox, 'clear');
            commentBox.onCancel({ preventDefault: () => {} });
            expect(clear).to.be.called;
        });
    });

    describe('createCommentBox()', () => {
        it('should create and return an HTML element for the UI', () => {
            const el = commentBox.createCommentBox();
            expect(el.nodeName).to.exist;
        });

        it('should create a reference to the text area', () => {
            commentBox.createCommentBox();
            expect(commentBox.textAreaEl).to.exist;
        });

        it('should create a reference to the cancel button', () => {
            commentBox.createCommentBox();
            expect(commentBox.cancelEl).to.exist;
        });

        it('should create a reference to the post button', () => {
            commentBox.createCommentBox();
            expect(commentBox.postEl).to.exist;
        });

        it('should add an event listener on the cancel and post buttons', () => {
            const uiElement = {
                addEventListener: sandbox.stub()
            };
            const el = document.createElement('section');
            sandbox.stub(el, 'querySelector').returns(uiElement);
            sandbox.stub(commentBox, 'createHTML').returns(el);

            commentBox.createCommentBox();
            expect(uiElement.addEventListener).to.be.calledWith('click', commentBox.onCancel);
            expect(uiElement.addEventListener).to.be.calledWith('click', commentBox.onPost);
        });
    });
});
