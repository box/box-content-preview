import '../polyfill';
import RepStatus from '../rep-status';
import fetchMock from 'fetch-mock';

const sandbox = sinon.sandbox.create();
let repStatus;

describe('Logger', () => {
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
        fetchMock.restore();
    });

    describe('updateStatus()', () => {
        it('should fetch latest status', () => {
            fetchMock.mock('https://info', {
                body: {
                    status: 'success',
                    files: [
                        'foo'
                    ]
                }
            });

            const spy = sandbox.spy(repStatus, 'handleResponse');

            return repStatus.updateStatus().then(() => {
                assert.equal('success', repStatus.representation.status);
                assert.equal('foo', repStatus.representation.links.files[0]);

                /* eslint-disable no-unused-expressions */
                expect(spy).to.be.called;
                /* eslint-enable no-unused-expressions */
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
});
