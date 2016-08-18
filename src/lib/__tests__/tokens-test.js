import getTokens from '../tokens';

function stringTokenFunction() {
    return Promise.resolve('token');
}

function mapTokenFunction(ids) {
    return Promise.resolve({
        [ids[0]]: 'token1',
        [ids[1]]: 'token2'
    });
}

describe('getTokens', () => {
    it('should throw an error when no id provided', () => {
        return getTokens(null, 'token').should.be.rejectedWith(Error);
    });
    it('should throw an error when no token provided', () => {
        return getTokens('123').should.be.rejectedWith(Error);
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
        return getTokens('123', mapTokenFunction).then((data) => {
            assert.equal('token1', data['123']);
        });
    });
    it('should create id token map with function token that returns map and array of string ids', () => {
        return getTokens(['123', '456'], mapTokenFunction).then((data) => {
            assert.equal('token1', data['123']);
            assert.equal('token2', data['456']);
        });
    });
    it('should throw an error when not all tokens could be fetched', () => {
        return getTokens(['123', '456', '789'], mapTokenFunction).should.be.rejectedWith(Error);
    });
});
