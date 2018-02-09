/**
 * General purpose time recording tool
 */
class Timer {
    times = {};

    create(key) {
        const time = {
            start: undefined,
            end: undefined,
            elapsed: undefined
        };

        this.times[key] = time;
        return time;
    }

    start(key) {
        console.log('START: ', key);
        let time = this.get(key);
        if (!time) {
            time = this.create(key);
        }

        // Can't start a timer that's already started
        if (time.start) {
            return;
        }

        time.start = global.performance.now();
        time.end = undefined;
        time.elapsed = undefined;
    }

    stop(key) {
        const time = this.get(key);
        // The timer has already been stopped. or hasn't started, don't stop it again.
        if (!time || time.start === undefined || time.end !== undefined) {
            return;
        }

        time.end = global.performance.now();
        time.elapsed = time.end - time.start;
        console.log('STOP:', key, time.elapsed);
    }

    get(key) {
        return this.times[key];
    }

    getAll() {
        return this.times;
    }

    reset() {
        Object.keys(this.times).forEach((key) => {
            delete this.times[key];
        });
    }
}

export default new Timer();
