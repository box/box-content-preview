/* eslint-disable no-unused-expressions */
import * as util from '../util';
import RepStatus from '../rep-status';

const sandbox = sinon.sandbox.create();
let repStatus;

const STATUS_UPDATE_INTERVAL_IN_MILLIS = 2000;

describe('RepStatus', () => {
    let rep;

    beforeEach(() => {
        rep = {
            info: {
                url: 'https://info'
            },
            links: {},
            status: {}
        };
        const logger = () => {};
        repStatus = new RepStatus({
            representation: rep,
            logger
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        if (repStatus && typeof repStatus.destroy === 'function') {
            repStatus.destroy();
        }

        repStatus = null;
    });

    describe('getStatus()', () => {
        it('should return the status from the representation state object', () => {
            const status = 'someStatus';
            expect(RepStatus.getStatus({
                status: {
                    state: status
                }
            })).to.equal(status);
        });
    });

    describe('constructor()', () => {
        const infoUrl = 'someUrl';

        beforeEach(() => {
            sandbox.stub(util, 'appendAuthParams').returns(infoUrl);
        });

        it('should set the correct object properties', () => {
            repStatus = new RepStatus({
                representation: rep,
                logger: {}
            });

            expect(repStatus.representation).to.deep.equal(rep);
            expect(repStatus.logger).to.be.an.object;
            expect(repStatus.infoUrl).to.equal(infoUrl);
            expect(repStatus.promise).to.be.a.promise;
        });
    });

    describe('destructor()', () => {
        it('should clear the status timeout', () => {
            sandbox.stub(window, 'clearTimeout');
            repStatus.destroy();
            expect(window.clearTimeout).to.have.been.calledWith(repStatus.statusTimeout);
        });
    });

    describe('updateStatus()', () => {
        it('should fetch latest status', () => {
            sandbox.stub(util, 'get').returns(Promise.resolve({
                status: {
                    state: 'success'
                }
            }));

            const spy = sandbox.spy(repStatus, 'handleResponse');

            return repStatus.updateStatus().then(() => {
                assert.equal('success', repStatus.representation.status.state);
                assert.isTrue(spy.called);
            });
        });

        it('should return a resolved promise if there is no info url', () => {
            sandbox.mock(util).expects('get').never();
            repStatus.infoUrl = '';
            expect(repStatus.updateStatus()).to.be.instanceof(Promise);
        });
    });

    describe('handleResponse()', () => {
        it('should reject if the rep status is error', () => {
            const rejectStub = sandbox.stub(repStatus, 'reject');
            repStatus.representation.status.state = 'error';

            repStatus.handleResponse();
            assert.isTrue(rejectStub.called);
        });

        it('should resolve if the rep status is success', () => {
            const resolveStub = sandbox.spy(repStatus, 'resolve');
            repStatus.representation.status.state = 'success';

            repStatus.handleResponse();
            assert.isTrue(resolveStub.called);
        });

        it('should resolve if the rep status is viewable', () => {
            const resolveStub = sandbox.spy(repStatus, 'resolve');
            repStatus.representation.status.state = 'viewable';

            repStatus.handleResponse();
            assert.isTrue(resolveStub.called);
        });

        it('should log that file needs conversion if status is pending and logger exists', () => {
            repStatus.logger = { setUnConverted: sandbox.stub() };
            repStatus.representation.status.state = 'pending';

            repStatus.handleResponse();
            assert.isTrue(repStatus.logger.setUnConverted.called);
        });

        it('should update status after a timeout', () => {
            const clock = sinon.useFakeTimers();
            repStatus.logger = false;
            const resolveStub = sandbox.spy(repStatus, 'resolve');
            const updateStatusStub = sandbox.stub(repStatus, 'updateStatus');
            repStatus.representation.status.state = 'pending';

            repStatus.handleResponse();
            clock.tick(STATUS_UPDATE_INTERVAL_IN_MILLIS + 1);
            assert.isTrue(updateStatusStub.called);
            assert.isFalse(resolveStub.called);
            clock.restore();
        });
    });

    describe('getPromise()', () => {
        it('handle response and return a promise', () => {
            const handleResponseStub = sandbox.stub(repStatus, 'handleResponse');
            repStatus.promise = 'promise';

            const successResult = repStatus.getPromise();
            assert.isTrue(handleResponseStub.called);
            assert.equal(successResult, 'promise');
        });
    });
});
