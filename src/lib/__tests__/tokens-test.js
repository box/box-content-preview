import getTokens from '../tokens';

describe('lib/tokens', () => {
    function stringTokenFunction() {
        return Promise.resolve('token');
    }

    function mapIdTokenFunction(ids) {
        if (ids.length > 1) {
            return Promise.resolve({
                [ids[0].replace('file_', '')]: 'token1',
                [ids[1].replace('file_', '')]: 'token2'
            });
        } else {
            return Promise.resolve({
                [ids[0].replace('file_', '')]: 'token1'
            });
        }
    }

    function mapTypedIdTokenFunction(ids) {
        if (ids.length > 1) {
            return Promise.resolve({
                [ids[0]]: 'token1',
                [ids[1]]: 'token2'
            });
        } else {
            return Promise.resolve({
                [ids[0]]: 'token1'
            });
        }
    }

    describe('getTokens', () => {
        it('should throw an error when no id provided', () => {
            return getTokens(null, 'token')
                .then(() => Assert.fail())
                .catch((err) => {
                    expect(err).to.be.an('error');
                });
        });
        it('should use undefined token when no token provided', () => {
            return getTokens('123').then((data) => {
                assert.equal(undefined, data['123']);
            });
        });
        it('should use null token when null token provided', () => {
            return getTokens('123', null).then((data) => {
                assert.equal(null, data['123']);
            });
        });
        it('should create id token map with string token and string id', () => {
            return getTokens('123', 'token').then((data) => {
                assert.equal('token', data['123']);
            });
        });
        it('should create id token map with string token and array of string ids', () => {
            return getTokens(['123', '456'], 'token').then((data) => {
                assert.equal('token', data['123']);
                assert.equal('token', data['456']);
            });
        });
        it('should create id token map with function token that returns string and string id', () => {
            return getTokens('123', stringTokenFunction).then((data) => {
                assert.equal('token', data['123']);
            });
        });
        it('should create id token map with function token that returns string and array of string ids', () => {
            return getTokens(['123', '456'], stringTokenFunction).then((data) => {
                assert.equal('token', data['123']);
                assert.equal('token', data['456']);
            });
        });
        it('should create id token map with function token that returns map and string id', () => {
            return getTokens('123', mapIdTokenFunction).then((data) => {
                assert.equal('token1', data['123']);
            });
        });
        it('should create id token map with function token that returns map and array of string ids', () => {
            return getTokens(['123', '456'], mapIdTokenFunction).then((data) => {
                assert.equal('token1', data['123']);
                assert.equal('token2', data['456']);
            });
        });
        it('should create id token map with function token that returns map and string typed id', () => {
            return getTokens('123', mapTypedIdTokenFunction).then((data) => {
                assert.equal('token1', data['123']);
            });
        });
        it('should create id token map with function token that returns map and array of string typed ids', () => {
            return getTokens(['123', '456'], mapTypedIdTokenFunction).then((data) => {
                assert.equal('token1', data['123']);
                assert.equal('token2', data['456']);
            });
        });
        it('should throw an error when not all tokens could be fetched', () => {
            return getTokens(['123', '456', '789'], mapIdTokenFunction)
                .then(() => Assert.fail())
                .catch((err) => {
                    expect(err).to.be.an('error');
                });
        });
    });
});
