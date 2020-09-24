import getTokens from '../tokens';

describe('lib/tokens', () => {
    /* eslint-disable require-jsdoc */
    function stringTokenFunction() {
        return Promise.resolve('token');
    }

    function mapIdTokenFunction(ids) {
        if (ids.length > 1) {
            return Promise.resolve({
                [ids[0].replace('file_', '')]: 'token1',
                [ids[1].replace('file_', '')]: 'token2',
            });
        }
        return Promise.resolve({
            [ids[0].replace('file_', '')]: 'token1',
        });
    }

    function mapTypedIdTokenFunction(ids) {
        if (ids.length > 1) {
            return Promise.resolve({
                [ids[0]]: 'token1',
                [ids[1]]: 'token2',
            });
        }
        return Promise.resolve({
            [ids[0]]: 'token1',
        });
    }
    /* eslint-enable require-jsdoc */

    describe('getTokens', () => {
        test('should throw an error when no id provided', () => {
            return getTokens(null, 'token')
                .then(() => fail())
                .catch(err => {
                    expect(err).toBeInstanceOf(Error);
                });
        });
        test('should use undefined token when no token provided', () => {
            return getTokens('123').then(data => {
                expect(undefined).toEqual(data['123']);
            });
        });
        test('should use null token when null token provided', () => {
            return getTokens('123', null).then(data => {
                expect(null).toEqual(data['123']);
            });
        });
        test('should create id token map with string token and string id', () => {
            return getTokens('123', 'token').then(data => {
                expect('token').toEqual(data['123']);
            });
        });
        test('should create id token map with string token and array of string ids', () => {
            return getTokens(['123', '456'], 'token').then(data => {
                expect('token').toEqual(data['123']);
                expect('token').toEqual(data['456']);
            });
        });
        test('should create id token map with function token that returns string and string id', () => {
            return getTokens('123', stringTokenFunction).then(data => {
                expect('token').toEqual(data['123']);
            });
        });
        test('should create id token map with function token that returns string and array of string ids', () => {
            return getTokens(['123', '456'], stringTokenFunction).then(data => {
                expect('token').toEqual(data['123']);
                expect('token').toEqual(data['456']);
            });
        });
        test('should create id token map with function token that returns map and string id', () => {
            return getTokens('123', mapIdTokenFunction).then(data => {
                expect('token1').toEqual(data['123']);
            });
        });
        test('should create id token map with function token that returns map and array of string ids', () => {
            return getTokens(['123', '456'], mapIdTokenFunction).then(data => {
                expect('token1').toEqual(data['123']);
                expect('token2').toEqual(data['456']);
            });
        });
        test('should create id token map with function token that returns map and string typed id', () => {
            return getTokens('123', mapTypedIdTokenFunction).then(data => {
                expect('token1').toEqual(data['123']);
            });
        });
        test('should create id token map with function token that returns map and array of string typed ids', () => {
            return getTokens(['123', '456'], mapTypedIdTokenFunction).then(data => {
                expect('token1').toEqual(data['123']);
                expect('token2').toEqual(data['456']);
            });
        });
        test('should throw an error when not all tokens could be fetched', () => {
            return getTokens(['123', '456', '789'], mapIdTokenFunction)
                .then(() => fail())
                .catch(err => {
                    expect(err).toBeInstanceOf(Error);
                });
        });
    });
});
