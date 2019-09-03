/* eslint-disable no-unused-expressions */
import * as util from '../util';
import Api from '../api';
import RepStatus from '../RepStatus';
import { LOAD_METRIC } from '../events';
import Timer from '../Timer';
import { STATUS_SUCCESS } from '../constants';

const sandbox = sinon.sandbox.create();
let repStatus;

const STATUS_UPDATE_INTERVAL_MS = 2000;

describe('lib/RepStatus', () => {
    let rep;
    const fileId = '12345';

    beforeEach(() => {
        rep = {
            info: {
                url: 'https://info',
            },
            links: {},
            status: {},
        };

        /* eslint-disable require-jsdoc */
        const logger = () => {};
        /* eslint-enable require-jsdoc */

        repStatus = new RepStatus({
            api: new Api(),
            representation: rep,
            logger,
            fileId,
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        if (repStatus && typeof repStatus.destroy === 'function') {
            repStatus.destroy();
        }

        repStatus = null;

        Timer.reset();
    });

    describe('getStatus()', () => {
        it('should return the status from the representation state object', () => {
            const status = 'someStatus';
            expect(
                RepStatus.getStatus({
                    status: {
                        state: status,
                    },
                }),
            ).to.equal(status);
        });
    });

    describe('getErrorCode()', () => {
        it('should return the code from the representation state object', () => {
            expect(
                RepStatus.getErrorCode({
                    status: {
                        code: 'conversion_failed',
                    },
                }),
            ).to.equal('conversion_failed');
        });
    });

    describe('constructor()', () => {
        const infoUrl = 'someUrl';

        beforeEach(() => {
            sandbox.stub(util, 'appendAuthParams').returns(infoUrl);
        });

        it('should set the correct object properties', () => {
            repStatus = new RepStatus({
                api: {},
                representation: rep,
                logger: {},
            });

            expect(repStatus.representation).to.deep.equal(rep);
            expect(repStatus.logger).to.be.a('object');
            expect(repStatus.infoUrl).to.equal(infoUrl);
            expect(repStatus.promise).to.be.a.promise;
        });
    });

    describe('destroy()', () => {
        it('should clear the status timeout', () => {
            sandbox.mock(window).expects('clearTimeout');
            repStatus.destroy();
        });
    });

    describe('updateStatus()', () => {
        const state = 'success';
        beforeEach(() => {
            sandbox.stub(repStatus, 'handleResponse');
        });

        it('should fetch latest status', () => {
            sandbox
                .mock(repStatus.api)
                .expects('get')
                .returns(
                    Promise.resolve({
                        status: {
                            state,
                        },
                    }),
                );

            return repStatus.updateStatus().then(() => {
                expect(repStatus.representation.status.state).to.equal(state);
                expect(repStatus.handleResponse).to.be.called;
            });
        });

        it('should update provided metadata', () => {
            sandbox
                .mock(repStatus.api)
                .expects('get')
                .returns(
                    Promise.resolve({
                        status: {
                            state,
                        },
                        metadata: {
                            pages: 10,
                        },
                    }),
                );

            return repStatus.updateStatus().then(() => {
                expect(repStatus.representation.status.state).to.equal(state);
                expect(repStatus.handleResponse).to.be.called;
                expect(repStatus.representation.metadata.pages).to.equal(10);
            });
        });

        it('should return a resolved promise if there is no info url', () => {
            sandbox
                .mock(Api.prototype)
                .expects('get')
                .never();
            repStatus.infoUrl = '';
            expect(repStatus.updateStatus()).to.be.instanceof(Promise);
        });

        it('should start a convert time Timer', () => {
            const tag = Timer.createTag(fileId, LOAD_METRIC.convertTime);
            repStatus.updateStatus();

            expect(Timer.get(tag)).to.exist;
        });
    });

    describe('handleResponse()', () => {
        beforeEach(() => {
            repStatus.resolve = () => {};
            repStatus.reject = () => {};
            repStatus.updateStatus = () => {};
        });

        it('should reject with the refresh message if the rep status is error', done => {
            sandbox
                .mock(repStatus)
                .expects('reject')
                .callsFake(err => {
                    expect(err.displayMessage).to.equal(__('error_refresh'));
                    done();
                });
            repStatus.representation.status.state = 'error';

            repStatus.handleResponse();
        });

        it('should reject with the protected message if the rep status is error due to a password protected PDF', done => {
            sandbox
                .mock(repStatus)
                .expects('reject')
                .callsFake(err => {
                    expect(err.displayMessage).to.equal(__('error_password_protected'));
                    done();
                });
            repStatus.representation.status.state = 'error';
            repStatus.representation.status.code = 'error_password_protected';

            repStatus.handleResponse();
        });

        it('should reject with the try again message if the rep status is error due to unavailability', done => {
            sandbox
                .mock(repStatus)
                .expects('reject')
                .callsFake(err => {
                    expect(err.displayMessage).to.equal(__('error_try_again_later'));
                    done();
                });
            repStatus.representation.status.state = 'error';
            repStatus.representation.status.code = 'error_try_again_later';

            repStatus.handleResponse();
        });

        it('should reject with the unsupported format message if the rep status is error due a bad file', done => {
            sandbox
                .mock(repStatus)
                .expects('reject')
                .callsFake(err => {
                    expect(err.displayMessage).to.equal(__('error_bad_file'));
                    done();
                });
            repStatus.representation.status.state = 'error';
            repStatus.representation.status.code = 'error_unsupported_format';

            repStatus.handleResponse();
        });

        it('should reject with the re upload message if the rep status is error due to conversion failure', done => {
            sandbox
                .mock(repStatus)
                .expects('reject')
                .callsFake(err => {
                    expect(err.displayMessage).to.equal(__('error_reupload'));
                    done();
                });
            repStatus.representation.status.state = 'error';
            repStatus.representation.status.code = 'error_conversion_failed';

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
                setUnConverted: () => {},
            };
            sandbox.mock(repStatus.logger).expects('setUnConverted');
            sandbox.stub(repStatus, 'emit');
            repStatus.representation.status.state = 'pending';

            repStatus.handleResponse();

            expect(repStatus.emit).to.be.calledWith('conversionpending');
        });

        it('should update status after a timeout and update interval when pending', () => {
            const clock = sinon.useFakeTimers();
            repStatus.logger = false;
            sandbox.mock(repStatus).expects('updateStatus');
            repStatus.representation.status.state = 'pending';

            repStatus.handleResponse();
            clock.tick(STATUS_UPDATE_INTERVAL_MS + 1);
            clock.restore();
        });

        it('should update status immediately after a timeout when none', () => {
            const clock = sinon.useFakeTimers();
            repStatus.logger = false;
            sandbox.mock(repStatus).expects('updateStatus');
            repStatus.representation.status.state = 'none';

            repStatus.handleResponse();
            clock.tick(1);
            clock.restore();
        });

        it('should stop a convert time Timer on success converting', () => {
            repStatus.representation.status.state = STATUS_SUCCESS;
            const tag = Timer.createTag(fileId, LOAD_METRIC.convertTime);
            Timer.start(tag);
            repStatus.handleResponse();

            // Elapsed will not exist if stop isn't called
            expect(Timer.get(tag).elapsed).to.exist;
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
