class Worker {
    constructor(stringUrl) {
        this.url = stringUrl;
        this.onmessage = () => {};
    }

    postMessage(msg) {
        this.onmessage(msg);
    }
}

module.exports = Worker;
