/* eslint-disable no-unused-expressions */
import DocPointDialog from '../DocPointDialog';
import * as annotatorUtil from '../../annotatorUtil';
import * as docAnnotatorUtil from '../docAnnotatorUtil';

let dialog;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/doc/DocPointDialog', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/doc/__tests__/DocPointDialog-test.html');

        dialog = new DocPointDialog({
            annotatedElement: document.querySelector('.annotated-element'),
            location: {},
            annotations: [],
            canAnnotate: true
        });
        dialog.localized = { addCommentPlaceholder: 'placeholder' };
        dialog.setup([]);
        dialog.threadEl = {
            offsetLeft: 1,
            offsetTop: 2
        };
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        if (typeof dialog.destroy === 'function') {
            dialog.destroy();
            dialog = null;
        }
    });

    describe('position()', () => {
        it('should position the dialog at the right place and show it', () => {
            sandbox.stub(annotatorUtil, 'showElement');
            sandbox.stub(annotatorUtil, 'repositionCaret');
            sandbox.stub(dialog, 'flipDialog').returns([]);

            dialog.position();

            expect(annotatorUtil.repositionCaret).to.be.called;
            expect(annotatorUtil.showElement).to.be.called;
            expect(dialog.flipDialog).to.be.called;
        });
    });
});
