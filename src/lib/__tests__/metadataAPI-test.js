/* eslint-disable no-unused-expressions */
import metadataAPI from '../metadataAPI';
import api from '../api';
import * as utils from '../util';

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

    describe('getXrefsMetadata()', () => {
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
                expect(response).to.eql({ hasxrefs: true });
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

    describe('getMetadata()', () => {
        it('Should get the metadata with the provided headers', () => {
            stubs.getHeaders = sandbox.stub(utils, 'getHeaders');

            metadataAPI.getMetadata('123', 'global', 'autocad', {
                apiHost: 'foo.com',
                token: '456',
                sharedLink: 'shared-link',
                sharedLinkPassword: 'shared-link-password'
            });

            expect(stubs.getHeaders).to.have.been.calledWith({}, '456', 'shared-link', 'shared-link-password');
        });
    });
});
