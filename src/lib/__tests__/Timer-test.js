/* eslint-disable no-unused-expressions */
import Timer from '../Timer';

const sandbox = sinon.sandbox.create();

describe('lib/Timer', () => {
    const tag = 'test';

    afterEach(() => {
        sandbox.verifyAndRestore();
        Timer.times = {};
    });

    describe('start()', () => {
        it("should create a new entry if one doesn't exist", () => {
            expect(Timer.get(tag)).to.not.exist;
            Timer.start(tag);
            expect(Timer.get(tag)).to.exist;
        });

        it('should do nothing if it has already been started', () => {
            sandbox.spy(global.performance, 'now');
            Timer.start(tag);
            Timer.start(tag);
            expect(global.performance.now).to.be.calledOnce;
        });

        it('should set time.start to current time, using performance', () => {
            const time = 100;
            sandbox.stub(global.performance, 'now').returns(time);
            Timer.start(tag);
            expect(Timer.get(tag).start).to.equal(time);
        });

        it('should reset end and elapsed of the time object', () => {
            // Setup so that we can call start again, but elapsed and end have value in them
            Timer.start(tag);
            Timer.stop(tag);
            Timer.get(tag).start = undefined;
            // Actual run
            Timer.start(tag);

            expect(Timer.get(tag).start).to.exist;
            expect(Timer.get(tag).end).to.not.exist;
            expect(Timer.get(tag).elapsed).to.not.exist;
        });
    });

    describe('stop()', () => {
        it('should do nothing if no time entry exists', () => {
            sandbox.spy(global.performance, 'now');
            Timer.stop();
            expect(global.performance.now).to.not.be.called;
        });

        it('should do nothing if no time has been started', () => {
            sandbox.spy(global.performance, 'now');
            Timer.times[tag] = { start: undefined };

            Timer.stop(tag);
            expect(global.performance.now).to.not.be.called;
        });

        it('should do nothing if it has already been stopped', () => {
            sandbox.spy(global.performance, 'now');
            Timer.times[tag] = { start: 1234, end: 2234 };

            Timer.stop(tag);
            expect(global.performance.now).to.not.be.called;
        });

        it('should set the end prop, and calculate the elapsed time', () => {
            sandbox.stub(global.performance, 'now').returns(5);
            Timer.times[tag] = { start: 3.5 };

            Timer.stop(tag);
            expect(Timer.get(tag).elapsed).to.equal(2); // 5 - 3.5 = 1.5, rounded = 2
        });
    });

    describe('get()', () => {
        it('should return the value at the given tag', () => {
            const otherTag = 'other';
            Timer.start(tag);
            Timer.start(otherTag);

            expect(Timer.get(tag)).to.deep.equal(Timer.times[tag]);
            expect(Timer.get(otherTag)).to.deep.equal(Timer.times[otherTag]);
            expect(Timer.get('yet another!')).to.not.exist;
        });
    });

    describe('reset()', () => {
        it('should reset the time structure values at the given tag', () => {
            Timer.start(tag);
            Timer.stop(tag);
            Timer.reset(tag);

            expect(Timer.get(tag)).to.exist;
            expect(Timer.get(tag).start).to.not.exist;
            expect(Timer.get(tag).end).to.not.exist;
            expect(Timer.get(tag).elapsed).to.not.exist;
        });

        it('should reset all of the time structures, when no params supplied', () => {
            Timer.start(tag);
            Timer.stop(tag);
            const other = 'another_tag';
            Timer.start(other);
            Timer.stop(other);

            Timer.reset();

            expect(Timer.get(tag).start).to.not.exist;
            expect(Timer.get(tag).end).to.not.exist;
            expect(Timer.get(tag).elapsed).to.not.exist;
            expect(Timer.get(other).start).to.not.exist;
            expect(Timer.get(other).end).to.not.exist;
            expect(Timer.get(other).elapsed).to.not.exist;
        });

        it('should reset multiple tags given an array of tags', () => {
            Timer.start(tag);
            Timer.stop(tag);
            const other = 'other_tag';
            Timer.start(other);
            Timer.stop(other);
            const another = 'another_tag';
            Timer.start(another);
            Timer.stop(another);
            Timer.reset([tag, other]);

            expect(Timer.get(tag).start).to.not.exist;
            expect(Timer.get(tag).end).to.not.exist;
            expect(Timer.get(tag).elapsed).to.not.exist;
            expect(Timer.get(other).start).to.not.exist;
            expect(Timer.get(other).end).to.not.exist;
            expect(Timer.get(other).elapsed).to.not.exist;
            expect(Timer.get(another).start).to.exist;
            expect(Timer.get(another).end).to.exist;
            expect(Timer.get(another).elapsed).to.exist;
        });
    });

    describe('createTag()', () => {
        it('should create a compliant tag that follows file_<ID>_<NAME>', () => {
            const createdTag = Timer.createTag('my_id', 'my_name');
            expect(createdTag).to.equal('file_my_id_my_name');
        });
    });

    describe('create()', () => {
        it('should create a new time structure at "tag" in the times dictionary', () => {
            Timer.create(tag);
            expect(Timer.get(tag)).to.deep.equal({ start: undefined, end: undefined, elapsed: undefined });
        });
    });
});
