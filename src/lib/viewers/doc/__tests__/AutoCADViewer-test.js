/* eslint-disable no-unused-expressions */
import DocumentViewer from '../DocumentViewer';
import Api from '../../../api';
import AutoCADViewer from '../AutoCADViewer';
import { METADATA } from '../../../constants';
import { MISSING_EXTERNAL_REFS } from '../../../events';

const { FIELD_HASXREFS, TEMPLATE_AUTOCAD } = METADATA;
const EXTENSION = 'dwg';

let containerEl;
let autocad;
let stubs = {};

describe('lib/viewers/doc/AutoCADViewer', () => {
    beforeEach(() => {
        containerEl = document.querySelector('.container');
        stubs.api = new Api();
        autocad = new AutoCADViewer({
            api: stubs.api,
            container: containerEl,
            file: {
                id: '0',
            },
        });

        stubs.getXrefsMetadata = jest.spyOn(stubs.api.metadata, 'getXrefsMetadata').mockImplementation();
        stubs.showNotification = jest.fn();
        stubs.emitMetric = jest.spyOn(autocad, 'emitMetric').mockImplementation();

        autocad.options = {
            file: {
                id: '123',
                extension: EXTENSION,
            },
            ui: {
                showNotification: stubs.showNotification,
            },
        };
    });

    afterEach(() => {
        fixture.cleanup();
        stubs = {};
    });

    describe('load()', () => {
        test('Should call the super.load and checkForXrefs', () => {
            stubs.docLoad = jest.spyOn(DocumentViewer.prototype, 'load').mockImplementation();
            stubs.checkForXrefs = jest.spyOn(autocad, 'checkForXrefs').mockImplementation();

            autocad.load();

            expect(stubs.docLoad).toBeCalled();
            expect(stubs.checkForXrefs).toBeCalled();
        });
    });

    describe('checkForXrefs()', () => {
        test('Should show notification if has external refs', () => {
            const xrefsPromise = Promise.resolve({ [FIELD_HASXREFS]: true });
            stubs.getXrefsMetadata.mockReturnValue(xrefsPromise);

            autocad.checkForXrefs();

            expect(stubs.getXrefsMetadata).toBeCalledWith('123', TEMPLATE_AUTOCAD, autocad.options);

            return xrefsPromise.then(() => {
                expect(stubs.showNotification).toBeCalled();
                expect(stubs.emitMetric).toBeCalledWith({ name: MISSING_EXTERNAL_REFS, data: EXTENSION });
            });
        });

        test('Should not show notification if does not have external refs', () => {
            const xrefsPromise = Promise.resolve({ [FIELD_HASXREFS]: false });
            stubs.getXrefsMetadata.mockReturnValue(xrefsPromise);

            autocad.checkForXrefs();

            expect(stubs.getXrefsMetadata).toBeCalledWith('123', TEMPLATE_AUTOCAD, autocad.options);

            return xrefsPromise.then(() => {
                expect(stubs.showNotification).not.toBeCalled();
                expect(stubs.emitMetric).not.toBeCalled();
            });
        });
    });
});
