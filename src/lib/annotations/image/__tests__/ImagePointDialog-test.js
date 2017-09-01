/* eslint-disable no-unused-expressions */
import ImagePointDialog from '../ImagePointDialog';
import * as annotatorUtil from '../../annotatorUtil';
import * as imageAnnotatorUtil from '../imageAnnotatorUtil';

let dialog;
const sandbox = sinon.sandbox.create();

describe('lib/annotations/image/ImagePointDialog', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('annotations/image/__tests__/ImagePointDialog-test.html');

        dialog = new ImagePointDialog({
            annotatedElement: document.querySelector('.annotated-element'),
            location: {
                page: 1
            },
            annotations: [],
            canAnnotate: true
        });
        dialog.setup([]);
        dialog.element.style.width = '282px';
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
            dialog.container = { clientHeight: 1 };
            sandbox.stub(annotatorUtil, 'repositionCaret');
            sandbox.stub(annotatorUtil, 'showElement');
            sandbox.stub(dialog, 'flipDialog').returns([]);

            dialog.position();

            expect(annotatorUtil.repositionCaret).to.have.been.called;
            expect(annotatorUtil.showElement).to.have.been.called;
            expect(dialog.flipDialog).to.have.been.called;
        });
    });
});
