/* eslint-disable no-unused-expressions */
import * as util from '../util';
import RepStatus from '../rep-status';

const sandbox = sinon.sandbox.create();
let repStatus;

const STATUS_UPDATE_INTERVAL_IN_MILLIS = 2000;

describe('RepStatus', () => {
    beforeEach(() => {
        const rep = {
            info: {
                url: 'https://info'
            },
            links: {},
            status: {}
        };
        const headers = {};
        const logger = () => {};
        repStatus = new RepStatus(rep, headers, logger);
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        if (repStatus && typeof repStatus.destroy === 'function') {
            repStatus.destroy();
        }

        repStatus = null;
    });

    describe('constructor()', () => {
        it('should set the correct object properties', () => {
            const rep = {
                info: {
                    url: 'https://info'
                },
                links: {},
                status: {}
            };

            assert.deepEqual(repStatus.headers, {});
            assert.deepEqual(repStatus.representation, rep);
            assert.deepEqual(typeof repStatus.logger, 'function');
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
                },
                files: [
                    'foo'
                ]
            }));

            const spy = sandbox.spy(repStatus, 'handleResponse');

            return repStatus.updateStatus().then(() => {
                assert.equal('success', repStatus.representation.status.state);
                assert.equal('foo', repStatus.representation.links.files[0]);

                assert.isTrue(spy.called);
            });
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
