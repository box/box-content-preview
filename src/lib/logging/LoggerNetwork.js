import xhr from '../util';

function post(url, data) {
    if (!data) {
        return Promise.reject('Did not provide data to post');
    }

    return xhr.post(url, data);
}
