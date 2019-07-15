/* eslint-disable no-unused-expressions */
import MetadataAPI from '../metadataAPI';
import Api from '../api';
import * as utils from '../util';

const sandbox = sinon.sandbox.create();
let stubs = {};

describe('metadataAPI', () => {
    beforeEach(() => {
        stubs = {};
        stubs.metaDataAPI = new MetadataAPI(new Api());
        stubs.get = sandbox.stub(Api.prototype, 'get');
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('getXrefsMetadata()', () => {
        it('Should reject the promise if id is not provided on the file', () => {
            return stubs.metaDataAPI.getXrefsMetadata(null, 'autocad').catch(err => {
                expect(stubs.get).not.to.have.been.called;
                expect(err instanceof Error).to.be.true;
            });
        });

        it('Should reject the promise if template is not provided on the file', () => {
            return stubs.metaDataAPI.getXrefsMetadata('123').catch(err => {
                expect(stubs.get).not.to.have.been.called;
                expect(err instanceof Error).to.be.true;
            });
        });

        it('Should return global template on api success', () => {
            const expResponse = { hasxrefs: 'true' };
            stubs.get.resolves(expResponse);

            return stubs.metaDataAPI.getXrefsMetadata('123', 'autocad', { api: stubs }).then(response => {
                expect(stubs.get).to.have.been.called;
                expect(response).to.eql({ hasxrefs: true });
            });
        });

        it('Should return an error for any other http 4xx', () => {
            const expResponse = { response: { status: 400 } };
            stubs.get.rejects(expResponse);

            return stubs.metaDataAPI.getXrefsMetadata('123', 'autocad', { api: stubs }).catch(err => {
                expect(stubs.get).to.have.been.called;
                expect(err).to.eql(expResponse);
            });
        });
    });

    describe('getMetadata()', () => {
        it('Should get the metadata with the provided headers', () => {
            stubs.getHeaders = sandbox.stub(utils, 'getHeaders');

            stubs.metaDataAPI.getMetadata('123', 'global', 'autocad', {
                api: stubs,
                apiHost: 'foo.com',
                token: '456',
                sharedLink: 'shared-link',
                sharedLinkPassword: 'shared-link-password',
            });

            expect(stubs.getHeaders).to.have.been.calledWith({}, '456', 'shared-link', 'shared-link-password');
        });
    });
});
