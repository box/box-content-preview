/* eslint-disable no-unused-expressions */
import * as util from '../util';
import RepStatus from '../rep-status';

const sandbox = sinon.sandbox.create();
let repStatus;

const STATUS_UPDATE_INTERVAL_IN_MILLIS = 2000;

describe('RepStatus', () => {
    beforeEach(() => {
        const rep = {
            links: {
                info: {
                    url: 'https://info'
                }
            }
        };
        const headers = {};
        const logger = () => {};
        const files = [];
        repStatus = new RepStatus(rep, headers, logger, files);
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('constructor()', () => {
        it('should set the correct object properties', () => {
            const rep = {
                links: {
                    info: {
                        url: 'https://info'
                    }
                }
            };

            assert.deepEqual(repStatus.headers, {});
            assert.deepEqual(repStatus.representation, rep);
            assert.deepEqual(typeof repStatus.logger, 'function');
            assert.deepEqual(repStatus.files, []);
        });
    });

    describe('updateStatus()', () => {
        it('should fetch latest status', () => {
            sandbox.stub(util, 'get').returns(Promise.resolve({
                status: 'success',
                files: [
                    'foo'
                ]
            }));

            const spy = sandbox.spy(repStatus, 'handleResponse');

            return repStatus.updateStatus().then(() => {
                assert.equal('success', repStatus.representation.status);
                assert.equal('foo', repStatus.representation.links.files[0]);

                assert.isTrue(spy.called);
            });
        });
    });

    describe('handlePending()', () => {
        it('should return false when there are no files', () => {
            repStatus.files = [];
            assert.notOk(repStatus.handlePending());
        });

        it('should return false when there are no files in status response', () => {
            repStatus.representation.links.files = [];
            assert.notOk(repStatus.handlePending());
        });

        it('should return false when files dont match', () => {
            repStatus.files = ['foo', 'bar'];
            repStatus.representation.links.files = [
                { url: 'foo' }
            ];
            assert.notOk(repStatus.handlePending());
        });

        it('should return true when files match', () => {
            repStatus.files = ['foo', 'bar'];
            repStatus.representation.links.files = [
                { url: 'foo' },
                { url: 'bar' }
            ];
            assert.ok(repStatus.handlePending());
        });
    });

    describe('handleResponse()', () => {
        it('should reject if the rep status is error', () => {
            const rejectStub = sandbox.stub(repStatus, 'reject');
            repStatus.representation.status = 'error';

            repStatus.handleResponse();
            assert.isTrue(rejectStub.called);
        });

        it('should resolve if the rep status is success', () => {
            const resolveStub = sandbox.spy(repStatus, 'resolve');
            repStatus.representation.status = 'success';

            repStatus.handleResponse();
            assert.isTrue(resolveStub.called);
        });

        it('should log that file needs conversion if status is pending and logger exists', () => {
            repStatus.logger = { setUnConverted: sandbox.stub() };
            repStatus.representation.status = 'pending';
            const updateStatusStub = sandbox.stub(repStatus, 'handlePending').returns(true);

            repStatus.handleResponse();
            assert.isTrue(repStatus.logger.setUnConverted.called);
            assert.isTrue(updateStatusStub.called);
        });

        it('should resolve if handlePending is true', () => {
            repStatus.logger = false;
            const handlePendingStub = sandbox.stub(repStatus, 'handlePending').returns(true);
            const resolveStub = sandbox.spy(repStatus, 'resolve');
            repStatus.representation.status = 'pending';

            repStatus.handleResponse();
            assert.isTrue(handlePendingStub.called);
            assert.isTrue(resolveStub.called);
        });

        it('should update status after a timeout, if handlePending is false', () => {
            const clock = sinon.useFakeTimers();
            repStatus.logger = false;
            const handlePendingStub = sandbox.stub(repStatus, 'handlePending').returns(false);
            const resolveStub = sandbox.spy(repStatus, 'resolve');
            const updateStatusStub = sandbox.stub(repStatus, 'updateStatus');
            repStatus.representation.status = 'pending';

            repStatus.handleResponse();
            clock.tick(STATUS_UPDATE_INTERVAL_IN_MILLIS + 1);
            assert.isTrue(handlePendingStub.called);
            assert.isTrue(updateStatusStub.called);
            assert.isFalse(resolveStub.called);
            clock.restore();
        });
    });

    describe('success()', () => {
        it('handle response and return a promise', () => {
            const handleResponseStub = sandbox.stub(repStatus, 'handleResponse');
            repStatus.promise = 'promise';

            const successResult = repStatus.success();
            assert.isTrue(handleResponseStub.called);
            assert.equal(successResult, 'promise');
        });
    });
});
