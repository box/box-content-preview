import api from '../api';

const sandbox = sinon.sandbox.create();

describe('API helper', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('get()', () => {
        const url = '/foo/bar';

        it('should call fetch on the URL', () => {
            sandbox.stub(api, 'xhr').resolves({ status: 200 });

            return api.get(url).then(() => {
                expect(api.xhr).to.have.been.calledWith(url, { method: 'get', responseType: 'json' });
            });
        });

        it('should call fetch on URL but fail when status is 404', () => {
            sandbox.stub(api, 'xhr').resolves({ status: 404 });

            return api.get(url).catch((err) => {
                expect(api.xhr).to.have.been.calledWith(url, { method: 'get', responseType: 'json' });
                expect(err.response.status).to.equal(404);
                expect(err.response.statusText).to.equal('Not Found');
            });
        });

        it('should call fetch on URL with headers', () => {
            const headers = { darth: 'vader' };
            sandbox.stub(api, 'xhr').resolves({ status: 200 });

            return api.get(url, { headers }).then(() => {
                expect(api.xhr).to.have.been.calledWith(url, { headers, method: 'get', responseType: 'json' });
            });
        });

        it('should call fetch on URL with headers and type text', () => {
            const responseText = 'lukeskywalker';
            const headers = { baz: 'but' };
            sandbox.stub(api, 'xhr').resolves({
                data: responseText,
                status: 200
            });

            return api.get(url, { headers, type: 'text' }).then((response) => {
                expect(api.xhr).to.have.been.calledWith(url, { headers, method: 'get', responseType: 'text' });
                expect(response.data).to.equal(responseText);
            });
        });

        it('should call fetch on URL with type blob', () => {
            const blob = new Blob(['text'], { type: 'text/plain' });
            sandbox.stub(api, 'xhr').resolves({
                data: blob,
                status: 200
            });

            return api.get(url, { type: 'blob' }).then((response) => {
                expect(api.xhr).to.have.been.calledWith(url, { method: 'get', responseType: 'blob' });
                expect(response.data).to.deep.equal(blob);
            });
        });

        it('should call fetch on URL with type text', () => {
            const responseText = 'darthsidious';
            sandbox.stub(api, 'xhr').resolves({
                data: responseText,
                status: 200
            });

            return api.get(url, { type: 'text' }).then((response) => {
                expect(api.xhr).to.have.been.calledWith(url, { method: 'get', responseType: 'text' });
                expect(response.data).to.equal(responseText);
            });
        });

        it('should call get on URL with type any', () => {
            sandbox.stub(api, 'xhr').resolves({
                data: 'greedo',
                status: 200
            });

            return api.get(url, { type: 'document' }).then((response) => {
                expect(api.xhr).to.have.been.calledWith(url, { method: 'get', responseType: 'document' });
                expect(typeof response === 'object').to.be.true; // eslint-disable-line
            });
        });
    });

    describe('head()', () => {
        it('should call head on URL', () => {
            const url = 'someurl';

            sandbox.stub(api, 'xhr').resolves({ status: 200 });

            return api.head(url).then(() => {
                expect(api.xhr).to.have.been.calledWith(url, { method: 'head' });
            });
        });
    });

    describe('post()', () => {
        it('should call post on URL', () => {
            const url = 'someurl';
            const data = { bar: 'bum' };
            const headers = { baz: 'but' };

            sandbox.stub(api, 'xhr').resolves({
                body: {
                    foo: 'bar'
                },
                status: 200
            });

            return api.post(url, data, { headers }).then(() => {
                expect(api.xhr).to.have.been.calledWith(url, { data, headers, method: 'post' });
            });
        });
    });

    describe('del()', () => {
        it('should call delete on URL', () => {
            const url = 'someurl';
            const data = { bar: 'bum' };
            const headers = { baz: 'but' };

            sandbox.stub(api, 'xhr').resolves({
                body: {
                    foo: 'bar'
                },
                status: 200
            });

            return api.del(url, data, { headers }).then(() => {
                expect(api.xhr).to.have.been.calledWith(url, { data, headers, method: 'delete' });
            });
        });
    });

    describe('put()', () => {
        it('should call put on URL', () => {
            const url = 'someurl';
            const data = { bar: 'bum' };
            const headers = { baz: 'but' };

            sandbox.stub(api, 'xhr').resolves({
                body: {
                    foo: 'bar'
                },
                status: 200
            });

            return api.put(url, data, { headers }).then(() => {
                expect(api.xhr).to.have.been.calledWith(url, { data, headers, method: 'put' });
            });
        });
    });
});
