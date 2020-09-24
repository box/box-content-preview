/* eslint-disable no-unused-expressions */
import MetadataAPI from '../metadataAPI';
import Api from '../api';
import * as utils from '../util';

let stubs = {};

describe('metadataAPI', () => {
    beforeEach(() => {
        stubs = {};
        stubs.metaDataAPI = new MetadataAPI(new Api());
        stubs.get = jest.spyOn(Api.prototype, 'get').mockImplementation();
    });

    describe('getXrefsMetadata()', () => {
        test('Should reject the promise if id is not provided on the file', () => {
            return stubs.metaDataAPI.getXrefsMetadata(null, 'autocad').catch(err => {
                expect(stubs.get).not.toBeCalled();
                expect(err).toBeInstanceOf(Error);
            });
        });

        test('Should reject the promise if template is not provided on the file', () => {
            return stubs.metaDataAPI.getXrefsMetadata('123').catch(err => {
                expect(stubs.get).not.toBeCalled();
                expect(err).toBeInstanceOf(Error);
            });
        });

        test('Should return global template on api success', () => {
            const expResponse = { hasxrefs: 'true' };
            stubs.get.mockResolvedValueOnce(expResponse);

            return stubs.metaDataAPI.getXrefsMetadata('123', 'autocad', { api: stubs }).then(response => {
                expect(stubs.get).toBeCalled();
                expect(response).toEqual({ hasxrefs: true });
            });
        });

        test('Should return an error for any other http 4xx', () => {
            const expResponse = { response: { status: 400 } };
            stubs.get.mockRejectedValueOnce(expResponse);

            return stubs.metaDataAPI.getXrefsMetadata('123', 'autocad', { api: stubs }).catch(err => {
                expect(stubs.get).toBeCalled();
                expect(err).toEqual(expResponse);
            });
        });
    });

    describe('getMetadata()', () => {
        test('Should get the metadata with the provided headers', () => {
            stubs.getHeaders = jest.spyOn(utils, 'getHeaders').mockImplementation(() => ({}));

            stubs.metaDataAPI.getMetadata('123', 'global', 'autocad', {
                api: stubs,
                apiHost: 'foo.com',
                token: '456',
                sharedLink: 'shared-link',
                sharedLinkPassword: 'shared-link-password',
            });

            expect(stubs.getHeaders).toBeCalledWith({}, '456', 'shared-link', 'shared-link-password');
        });
    });
});
