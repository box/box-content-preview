import Api from '../api';

describe('API helper', () => {
    let api;

    beforeEach(() => {
        api = new Api();
    });

    describe('parseResponse()', () => {
        const url = '/foo/bar';

        test('should return the full response when the status is 202 or 204', () => {
            const response = {
                status: 202,
                data: 'foo',
            };

            jest.spyOn(api, 'client').mockResolvedValue(response);

            api.get(url).then(data => {
                expect(data).toBe(response);
            });

            response.status = 204;

            api.get(url).then(data => {
                expect(data).toBe(response);
            });
        });

        test('should only return the data', () => {
            const data = 'foo';
            const result = {
                status: 200,
                data,
            };

            jest.spyOn(api, 'client').mockResolvedValue(result);

            return api.get(url).then(response => {
                expect(response).toBe(data);
            });
        });
    });

    describe('get()', () => {
        const url = '/foo/bar';

        test('should call fetch on the URL', () => {
            jest.spyOn(api, 'xhr').mockResolvedValue({ status: 200 });

            return api.get(url).then(() => {
                expect(api.xhr).toBeCalledWith(url, { method: 'get', responseType: 'json' });
            });
        });

        test('should call fetch on URL but fail when status is 404', () => {
            jest.spyOn(api, 'xhr').mockResolvedValue({ status: 404 });

            return api.get(url).catch(err => {
                expect(api.xhr).toBeCalledWith(url, { method: 'get', responseType: 'json' });
                expect(err.response.status).toBe(404);
                expect(err.response.statusText).toBe('Not Found');
            });
        });

        test('should call fetch on URL with headers', () => {
            const headers = { darth: 'vader' };
            jest.spyOn(api, 'xhr').mockResolvedValue({ status: 200 });

            return api.get(url, { headers }).then(() => {
                expect(api.xhr).toBeCalledWith(url, { headers, method: 'get', responseType: 'json' });
            });
        });

        test('should call fetch on URL with headers and type text', () => {
            const responseText = 'lukeskywalker';
            const headers = { baz: 'but' };
            jest.spyOn(api, 'xhr').mockResolvedValue({
                data: responseText,
                status: 200,
            });

            return api.get(url, { headers, type: 'text' }).then(response => {
                expect(api.xhr).toBeCalledWith(url, { headers, method: 'get', responseType: 'text' });
                expect(response.data).toBe(responseText);
            });
        });

        test('should call fetch on URL with type blob', () => {
            const blob = new Blob(['text'], { type: 'text/plain' });
            jest.spyOn(api, 'xhr').mockResolvedValue({
                data: blob,
                status: 200,
            });

            return api.get(url, { type: 'blob' }).then(response => {
                expect(api.xhr).toBeCalledWith(url, { method: 'get', responseType: 'blob' });
                expect(response.data).toBe(blob);
            });
        });

        test('should call fetch on URL with type text', () => {
            const responseText = 'darthsidious';
            jest.spyOn(api, 'xhr').mockResolvedValue({
                data: responseText,
                status: 200,
            });

            return api.get(url, { type: 'text' }).then(response => {
                expect(api.xhr).toBeCalledWith(url, { method: 'get', responseType: 'text' });
                expect(response.data).toBe(responseText);
            });
        });

        test('should call get on URL with type any', () => {
            jest.spyOn(api, 'xhr').mockResolvedValue({
                data: 'greedo',
                status: 200,
            });

            return api.get(url, { type: 'document' }).then(response => {
                expect(api.xhr).toBeCalledWith(url, { method: 'get', responseType: 'document' });
                expect(typeof response === 'object').toBe(true); // eslint-disable-line
            });
        });
    });

    describe('head()', () => {
        test('should call head on URL', () => {
            const url = 'someurl';

            jest.spyOn(api, 'xhr').mockResolvedValue({ status: 200 });

            return api.head(url).then(() => {
                expect(api.xhr).toBeCalledWith(url, { method: 'head' });
            });
        });
    });

    describe('post()', () => {
        test('should call post on URL', () => {
            const url = 'someurl';
            const data = { bar: 'bum' };
            const headers = { baz: 'but' };

            jest.spyOn(api, 'xhr').mockResolvedValue({
                body: {
                    foo: 'bar',
                },
                status: 200,
            });

            return api.post(url, data, { headers }).then(() => {
                expect(api.xhr).toBeCalledWith(url, { data, headers, method: 'post' });
            });
        });
    });

    describe('delete()', () => {
        test('should call delete on URL', () => {
            const url = 'someurl';
            const data = { bar: 'bum' };
            const headers = { baz: 'but' };

            jest.spyOn(api, 'xhr').mockResolvedValue({
                body: {
                    foo: 'bar',
                },
                status: 200,
            });

            return api.delete(url, data, { headers }).then(() => {
                expect(api.xhr).toBeCalledWith(url, { data, headers, method: 'delete' });
            });
        });
    });

    describe('put()', () => {
        test('should call put on URL', () => {
            const url = 'someurl';
            const data = { bar: 'bum' };
            const headers = { baz: 'but' };

            jest.spyOn(api, 'xhr').mockResolvedValue({
                body: {
                    foo: 'bar',
                },
                status: 200,
            });

            return api.put(url, data, { headers }).then(() => {
                expect(api.xhr).toBeCalledWith(url, { data, headers, method: 'put' });
            });
        });
    });

    describe('addResponseInterceptor', () => {
        test('should add an http response interceptor', () => {
            const responseInterceptor = jest.fn();
            api.addResponseInterceptor(responseInterceptor);

            expect(api.client.interceptors.response.handlers[0].fulfilled).toBe(responseInterceptor);
        });
    });

    describe('addRequestInterceptor', () => {
        test('should add an http request interceptor', () => {
            const requestInterceptor = jest.fn();
            api.addRequestInterceptor(requestInterceptor);

            expect(api.client.interceptors.request.handlers[0].fulfilled).toBe(requestInterceptor);
        });
    });

    describe('ejectInterceptors', () => {
        test('should remove all interceptors', () => {
            const requestInterceptor = jest.fn();
            const responseInterceptor = jest.fn();

            api.addRequestInterceptor(requestInterceptor);
            api.addRequestInterceptor(requestInterceptor);
            api.addResponseInterceptor(responseInterceptor);
            api.addResponseInterceptor(responseInterceptor);

            api.ejectInterceptors();

            expect(api.client.interceptors.request.handlers[0]).toBeNull();
            expect(api.client.interceptors.response.handlers[0]).toBeNull();
        });
    });
});
