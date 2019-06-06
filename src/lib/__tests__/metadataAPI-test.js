/* eslint-disable no-unused-expressions */
import metadataAPI from '../metadataAPI';
import api from '../api';

const sandbox = sinon.sandbox.create();
let stubs = {};

describe('metadataAPI', () => {
    beforeEach(() => {
        stubs = {};
        stubs.get = sandbox.stub(api, 'get');
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('getXrefsMetadata', () => {
        it('Should reject the promise if id is not provided on the file', () => {
            return metadataAPI.getXrefsMetadata(null, 'autocad').catch((err) => {
                expect(stubs.get).not.to.have.been.called;
                expect(err instanceof Error).to.be.true;
            });
        });

        it('Should reject the promise if template is not provided on the file', () => {
            return metadataAPI.getXrefsMetadata('123').catch((err) => {
                expect(stubs.get).not.to.have.been.called;
                expect(err instanceof Error).to.be.true;
            });
        });

        it('Should return global template on api success', () => {
            const expResponse = { hasxrefs: 'true' };
            stubs.get.resolves(expResponse);

            return metadataAPI.getXrefsMetadata('123', 'autocad').then((response) => {
                expect(stubs.get).to.have.been.called;
                expect(response).to.eql(expResponse);
            });
        });

        it('Should return manufactured global template on api 404', () => {
            const expResponse = { hasxrefs: 'false' };
            stubs.get.rejects({ response: { status: 404 } });

            return metadataAPI.getXrefsMetadata('123', 'autocad').then((response) => {
                expect(stubs.get).to.have.been.called;
                expect(response).to.eql(expResponse);
            });
        });

        it('Should return an error for any other http 4xx', () => {
            const expResponse = { response: { status: 400 } };
            stubs.get.rejects(expResponse);

            return metadataAPI.getXrefsMetadata('123', 'autocad').catch((err) => {
                expect(stubs.get).to.have.been.called;
                expect(err).to.eql(expResponse);
            });
        });
    });
});
