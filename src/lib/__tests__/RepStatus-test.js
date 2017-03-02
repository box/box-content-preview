/* eslint-disable no-unused-expressions */
import RepStatus from '../RepStatus';
import * as util from '../util';

const sandbox = sinon.sandbox.create();
let repStatus;

const STATUS_UPDATE_INTERVAL_MS = 2000;

describe('lib/RepStatus', () => {
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

    describe('destroy()', () => {
        it('should clear the status timeout', () => {
            sandbox.mock(window).expects('clearTimeout').withArgs(repStatus.statusTimeout);
            repStatus.destroy();
        });
    });

    describe('updateStatus()', () => {
        it('should fetch latest status', () => {
            const state = 'success';
            sandbox.mock(util).expects('get').returns(Promise.resolve({
                status: {
                    state
                }
            }));
            sandbox.mock(window).expects('clearTimeout').withArgs(repStatus.statusTimeout);
            sandbox.stub(repStatus, 'handleResponse');

            return repStatus.updateStatus().then(() => {
                expect(repStatus.representation.status.state).to.equal(state);
                expect(repStatus.handleResponse).to.be.called;
            });
        });

        it('should return a resolved promise if there is no info url', () => {
            sandbox.mock(util).expects('get').never();
            repStatus.infoUrl = '';
            expect(repStatus.updateStatus()).to.be.instanceof(Promise);
        });
    });

    describe('handleResponse()', () => {
        beforeEach(() => {
            repStatus.resolve = () => {};
            repStatus.reject = () => {};
            repStatus.updateStatus = () => {};
        });

        it('should reject if the rep status is error', () => {
            sandbox.mock(repStatus).expects('reject');
            repStatus.representation.status.state = 'error';

            repStatus.handleResponse();
        });

        it('should resolve if the rep status is success', () => {
            sandbox.mock(repStatus).expects('resolve');
            repStatus.representation.status.state = 'success';

            repStatus.handleResponse();
        });

        it('should resolve if the rep status is viewable', () => {
            sandbox.mock(repStatus).expects('resolve');
            repStatus.representation.status.state = 'viewable';

            repStatus.handleResponse();
        });

        it('should log that file needs conversion if status is pending and logger exists', () => {
            repStatus.logger = {
                setUnConverted: () => {}
            };
            sandbox.mock(repStatus.logger).expects('setUnConverted');
            repStatus.representation.status.state = 'pending';

            repStatus.handleResponse();
        });

        it('should update status after a timeout', () => {
            const clock = sinon.useFakeTimers();
            repStatus.logger = false;
            sandbox.mock(repStatus).expects('updateStatus');
            repStatus.representation.status.state = 'pending';

            repStatus.handleResponse();
            clock.tick(STATUS_UPDATE_INTERVAL_MS + 1);
            clock.restore();
        });
    });

    describe('getPromise()', () => {
        it('handle response and return a promise', () => {
            sandbox.stub(repStatus, 'handleResponse');
            repStatus.promise = 'promise';

            expect(repStatus.getPromise()).to.equal('promise');
            expect(repStatus.handleResponse).to.be.called;
        });
    });
});
