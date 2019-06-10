/* eslint-disable no-unused-expressions */
import DocumentViewer from '../DocumentViewer';
import AutoCADViewer from '../AutoCADViewer';
import metadataAPI from '../../../metadataAPI';
import { METADATA } from '../../../constants';

const { FIELD_HASXREFS, TEMPLATE_AUTOCAD } = METADATA;
const sandbox = sinon.sandbox.create();

let containerEl;
let autocad;
let stubs = {};

describe('lib/viewers/doc/AutoCADViewer', () => {
    beforeEach(() => {
        containerEl = document.querySelector('.container');
        autocad = new AutoCADViewer({
            container: containerEl,
            file: {
                id: '0'
            }
        });

        stubs.getXrefsMetadata = sandbox.stub(metadataAPI, 'getXrefsMetadata');
        stubs.showNotification = sandbox.stub();

        autocad.options = {
            file: {
                id: '123'
            },
            ui: {
                showNotification: stubs.showNotification
            }
        };
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();
        stubs = {};
    });

    describe('load()', () => {
        it('Should call the super.load and checkForXrefs', () => {
            stubs.docLoad = sandbox.stub(DocumentViewer.prototype, 'load');
            stubs.checkForXrefs = sandbox.stub(autocad, 'checkForXrefs');

            autocad.load();

            expect(stubs.docLoad).to.have.been.called;
            expect(stubs.checkForXrefs).to.have.been.called;
        });
    });

    describe('checkForXrefs()', () => {
        it('Should show notification if has external refs', () => {
            const xrefsPromise = Promise.resolve({ [FIELD_HASXREFS]: true });
            stubs.getXrefsMetadata.resolves(xrefsPromise);

            autocad.checkForXrefs();

            expect(stubs.getXrefsMetadata).to.have.been.calledWith('123', TEMPLATE_AUTOCAD, autocad.options);

            return xrefsPromise.then(() => {
                expect(stubs.showNotification).to.have.been.called;
            });
        });

        it('Should not show notification if does not have external refs', () => {
            const xrefsPromise = Promise.resolve({ [FIELD_HASXREFS]: false });
            stubs.getXrefsMetadata.resolves(xrefsPromise);

            autocad.checkForXrefs();

            expect(stubs.getXrefsMetadata).to.have.been.calledWith('123', TEMPLATE_AUTOCAD, autocad.options);

            return xrefsPromise.then(() => {
                expect(stubs.showNotification).not.to.have.been.called;
            });
        });
    });
});
