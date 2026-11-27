/* eslint-disable no-unused-expressions */
import * as util from '../util';
import Api from '../api';
import RepStatus from '../RepStatus';
import { ERROR_CODE, LOAD_METRIC } from '../events';
import Timer from '../Timer';
import { STATUS_SUCCESS } from '../constants';

const sandbox = sinon.createSandbox();
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
        test('should return the status from the representation state object', () => {
            const status = 'someStatus';
            expect(
                RepStatus.getStatus({
                    status: {
                        state: status,
                    },
                }),
            ).toBe(status);
        });
    });

    describe('getErrorCode()', () => {
        test('should return the code from the representation state object', () => {
            expect(
                RepStatus.getErrorCode({
                    status: {
                        code: 'conversion_failed',
                    },
                }),
            ).toBe('conversion_failed');
        });
    });

    describe('getStateFromInfo()', () => {
        test('should return undefined when there is no info', () => {
            expect(RepStatus.getStateFromInfo(undefined)).toBeUndefined();
        });

        test('should return the state from the status object', () => {
            expect(RepStatus.getStateFromInfo({ status: { state: 'success' } })).toBe('success');
        });

        test('should return undefined when the status object has no state', () => {
            expect(RepStatus.getStateFromInfo({ status: {} })).toBeUndefined();
        });

        test('should return undefined when the status object is null', () => {
            expect(RepStatus.getStateFromInfo({ status: null })).toBeUndefined();
        });

        test('should fall back to temp_status when status is not an object', () => {
            expect(RepStatus.getStateFromInfo({ temp_status: { state: 'pending' } })).toBe('pending');
        });

        test('should return undefined when neither status nor temp_status carry a state', () => {
            expect(RepStatus.getStateFromInfo({})).toBeUndefined();
        });
    });

    describe('constructor()', () => {
        const infoUrl = 'someUrl';

        beforeEach(() => {
            jest.spyOn(util, 'appendAuthParamsV2').mockReturnValue(infoUrl);
            jest.spyOn(util, 'getHeaders').mockReturnValue({});
        });

        test('should set the correct object properties', () => {
            repStatus = new RepStatus({
                api: {},
                representation: rep,
                logger: {},
            });

            expect(repStatus.representation).toBe(rep);
            expect(typeof repStatus.logger).toBe('object');
            expect(repStatus.infoUrl).toBe(infoUrl);
            expect(repStatus.promise).toBeInstanceOf(Promise);
            expect(repStatus.enableConvertTimer).toBe(true);
        });

        test('should disable the convert timer when told to', () => {
            repStatus = new RepStatus({
                api: {},
                representation: rep,
                logger: {},
                enableConvertTimer: false,
            });

            expect(repStatus.enableConvertTimer).toBe(false);
        });

        test('should use appendAuthParamsV2 and set Authorization headers', () => {
            const v2Url = 'v2Url';
            util.appendAuthParamsV2.mockReturnValue(v2Url);
            util.getHeaders.mockReturnValue({ Authorization: 'Bearer token' });

            repStatus = new RepStatus({
                api: {},
                representation: rep,
                token: 'token',
                sharedLink: 'sharedLink',
                sharedLinkPassword: 'password',
                logger: {},
            });

            expect(util.appendAuthParamsV2).toBeCalledWith(rep.info.url, 'sharedLink', 'password');
            expect(util.getHeaders).toBeCalledWith({}, 'token');
            expect(repStatus.infoUrl).toBe(v2Url);
            expect(repStatus.headers).toEqual({ Authorization: 'Bearer token' });
        });
    });

    describe('destroy()', () => {
        test('should clear the status timeout', () => {
            sandbox.mock(window).expects('clearTimeout');
            repStatus.destroy();
        });

        test('should mark the instance destroyed', () => {
            repStatus.destroy();
            expect(repStatus.destroyed).toBe(true);
        });
    });

    describe('updateStatus()', () => {
        const state = 'success';

        beforeEach(() => {
            jest.spyOn(repStatus, 'handleResponse').mockImplementation();
        });

        test('should fetch latest status', () => {
            jest.spyOn(repStatus.api, 'get').mockResolvedValue({
                info: {},
                status: {
                    state,
                },
            });

            return repStatus.updateStatus().then(() => {
                expect(repStatus.api.get).toBeCalled();
                expect(repStatus.representation.status.state).toBe(state);
                expect(repStatus.handleResponse).toBeCalled();
            });
        });

        test('should update provided metadata', () => {
            jest.spyOn(repStatus.api, 'get').mockResolvedValue({
                info: {},
                metadata: {
                    pages: 10,
                },
                status: {
                    state,
                },
            });

            return repStatus.updateStatus().then(() => {
                expect(repStatus.api.get).toBeCalled();
                expect(repStatus.handleResponse).toBeCalled();
                expect(repStatus.representation.status.state).toBe(state);
                expect(repStatus.representation.metadata.pages).toBe(10);
            });
        });

        test('should return a resolved promise if there is no info url', () => {
            jest.spyOn(repStatus.api, 'get');

            repStatus.infoUrl = '';
            expect(repStatus.updateStatus()).toBeInstanceOf(Promise);
            expect(repStatus.api.get).not.toBeCalled();
        });

        test('should return a resolved promise without fetching if destroyed', () => {
            jest.spyOn(repStatus.api, 'get');

            repStatus.destroyed = true;
            expect(repStatus.updateStatus()).toBeInstanceOf(Promise);
            expect(repStatus.api.get).not.toBeCalled();
        });

        test('should start a convert time Timer', () => {
            jest.spyOn(repStatus.api, 'get').mockResolvedValue({
                info: {},
                status: {
                    state,
                },
            });

            const tag = Timer.createTag(fileId, LOAD_METRIC.convertTime);

            return repStatus.updateStatus().then(() => {
                expect(Timer.get(tag)).toBeDefined();
            });
        });

        test('should not start a convert time Timer when the timer is disabled', () => {
            repStatus.enableConvertTimer = false;
            jest.spyOn(repStatus.api, 'get').mockResolvedValue({
                info: {},
                status: {
                    state,
                },
            });
            jest.spyOn(Timer, 'start');

            return repStatus.updateStatus().then(() => {
                expect(Timer.start).not.toBeCalled();
            });
        });

        test('should not process a response that arrives after it is destroyed', () => {
            jest.spyOn(repStatus.api, 'get').mockImplementation(() => {
                repStatus.destroyed = true;
                return Promise.resolve({ info: {}, status: { state } });
            });

            return repStatus.updateStatus().then(() => {
                expect(repStatus.handleResponse).not.toBeCalled();
            });
        });

        test('should reject when the info response has no status state', () => {
            jest.spyOn(repStatus.api, 'get').mockResolvedValue({ info: {} });
            jest.spyOn(repStatus, 'reject').mockImplementation();

            return repStatus.updateStatus().then(() => {
                expect(repStatus.reject).toBeCalled();
                expect(repStatus.handleResponse).not.toBeCalled();
            });
        });

        test('should reject the status promise when the info request fails instead of hanging', () => {
            jest.spyOn(repStatus.api, 'get').mockRejectedValue(new Error('Not Found'));
            jest.spyOn(repStatus, 'reject').mockImplementation();

            return repStatus.updateStatus().then(() => {
                expect(repStatus.reject).toBeCalled();
                expect(repStatus.handleResponse).not.toBeCalled();
            });
        });

        test('should not reject a failed info request after it is destroyed', () => {
            jest.spyOn(repStatus.api, 'get').mockImplementation(() => {
                repStatus.destroyed = true;
                return Promise.reject(new Error('Not Found'));
            });
            jest.spyOn(repStatus, 'reject').mockImplementation();

            return repStatus.updateStatus().then(() => {
                expect(repStatus.reject).not.toBeCalled();
            });
        });
    });

    describe('handleResponse()', () => {
        beforeEach(() => {
            repStatus.resolve = () => {};
            repStatus.reject = () => {};
            repStatus.updateStatus = () => {};
        });

        test('should reject with the refresh message if the rep status is error', done => {
            sandbox
                .mock(repStatus)
                .expects('reject')
                .callsFake(err => {
                    expect(err.displayMessage).toBe(__('error_refresh'));
                    done();
                });
            repStatus.representation.status.state = 'error';

            repStatus.handleResponse();
        });

        test('should reject with the protected message if the rep status is error due to a password protected PDF', done => {
            sandbox
                .mock(repStatus)
                .expects('reject')
                .callsFake(err => {
                    expect(err.displayMessage).toBe(__('error_password_protected'));
                    done();
                });
            repStatus.representation.status.state = 'error';
            repStatus.representation.status.code = 'error_password_protected';

            repStatus.handleResponse();
        });

        test('should reject with the try again message if the rep status is error due to unavailability', done => {
            sandbox
                .mock(repStatus)
                .expects('reject')
                .callsFake(err => {
                    expect(err.displayMessage).toBe(__('error_try_again_later'));
                    done();
                });
            repStatus.representation.status.state = 'error';
            repStatus.representation.status.code = 'error_try_again_later';

            repStatus.handleResponse();
        });

        test('should reject with the unsupported format message if the rep status is error due a bad file', done => {
            sandbox
                .mock(repStatus)
                .expects('reject')
                .callsFake(err => {
                    expect(err.displayMessage).toBe(__('error_bad_file'));
                    done();
                });
            repStatus.representation.status.state = 'error';
            repStatus.representation.status.code = 'error_unsupported_format';

            repStatus.handleResponse();
        });

        test('should reject with the file too big message if the rep status is error due to conversion failure', done => {
            sandbox
                .mock(repStatus)
                .expects('reject')
                .callsFake(err => {
                    expect(err.displayMessage).toBe(__('error_large_file'));
                    done();
                });
            repStatus.representation.status.state = 'error';
            repStatus.representation.status.code = 'error_large_size_file';

            repStatus.handleResponse();
        });

        test('should reject with the 0 byte file message if the rep status is error due to conversion failure', done => {
            sandbox
                .mock(repStatus)
                .expects('reject')
                .callsFake(err => {
                    expect(err.displayMessage).toBe(__('error_zero_byte_file'));
                    done();
                });
            repStatus.representation.status.state = 'error';
            repStatus.representation.status.code = 'error_zero_byte_file';

            repStatus.handleResponse();
        });

        test('should reject with the re upload message if the rep status is error due to conversion failure', done => {
            sandbox
                .mock(repStatus)
                .expects('reject')
                .callsFake(err => {
                    expect(err.displayMessage).toBe(__('error_reupload'));
                    done();
                });
            repStatus.representation.status.state = 'error';
            repStatus.representation.status.code = 'error_conversion_failed';

            repStatus.handleResponse();
        });

        test('should resolve if the rep status is success', () => {
            sandbox.mock(repStatus).expects('resolve');
            repStatus.representation.status.state = 'success';

            repStatus.handleResponse();
        });

        test('should resolve if the rep status is viewable', () => {
            sandbox.mock(repStatus).expects('resolve');
            repStatus.representation.status.state = 'viewable';

            repStatus.handleResponse();
        });

        test('should log that file needs conversion if status is pending and logger exists', () => {
            repStatus.logger = {
                setUnConverted: () => {},
            };
            sandbox.mock(repStatus.logger).expects('setUnConverted');
            jest.spyOn(repStatus, 'emit');
            repStatus.representation.status.state = 'pending';

            repStatus.handleResponse();

            expect(repStatus.emit).toBeCalledWith('conversionpending');
        });

        test('should update status after a timeout and update interval when pending', () => {
            const clock = sinon.useFakeTimers();
            repStatus.logger = false;
            sandbox.mock(repStatus).expects('updateStatus');
            repStatus.representation.status.state = 'pending';

            repStatus.handleResponse();
            clock.tick(STATUS_UPDATE_INTERVAL_MS + 1);
            clock.restore();
        });

        test('should update status immediately after a timeout when none', () => {
            const clock = sinon.useFakeTimers();
            repStatus.logger = false;
            sandbox.mock(repStatus).expects('updateStatus');
            repStatus.representation.status.state = 'none';

            repStatus.handleResponse();
            clock.tick(1);
            clock.restore();
        });

        describe('polling backoff', () => {
            const getPollDelays = setTimeoutStub => setTimeoutStub.mock.calls.map(([, delay]) => delay);
            let stubs;

            beforeEach(() => {
                stubs = {};
                repStatus.logger = false;
                stubs.setTimeout = jest.spyOn(global, 'setTimeout').mockImplementation(() => 1);
                stubs.now = jest.spyOn(Date, 'now').mockReturnValue(0);
            });

            test('should poll a pending status at a fixed interval without a backoff', () => {
                repStatus.representation.status.state = 'pending';

                repStatus.handleResponse();
                repStatus.handleResponse();
                repStatus.handleResponse();

                expect(getPollDelays(stubs.setTimeout)).toEqual([2000, 2000, 2000]);
            });

            test('should grow the pending poll interval by the backoff factor up to the maximum', () => {
                repStatus.backoff = { factor: 1.5, maxIntervalMs: 10000, maxWaitMs: 600000 };
                repStatus.representation.status.state = 'pending';

                for (let i = 0; i < 6; i += 1) {
                    repStatus.handleResponse();
                }

                expect(getPollDelays(stubs.setTimeout)).toEqual([2000, 3000, 4500, 6750, 10000, 10000]);
            });

            test('should double the pending poll interval when the backoff has no factor', () => {
                repStatus.backoff = { maxIntervalMs: 30000, maxWaitMs: 600000 };
                repStatus.representation.status.state = 'pending';

                for (let i = 0; i < 6; i += 1) {
                    repStatus.handleResponse();
                }

                expect(getPollDelays(stubs.setTimeout)).toEqual([2000, 4000, 8000, 16000, 30000, 30000]);
            });

            test('should poll a none status immediately without growing the backoff interval', () => {
                repStatus.backoff = { maxIntervalMs: 30000, maxWaitMs: 600000 };

                repStatus.representation.status.state = 'none';
                repStatus.handleResponse();
                repStatus.representation.status.state = 'pending';
                repStatus.handleResponse();

                expect(getPollDelays(stubs.setTimeout)).toEqual([0, 2000]);
            });

            test('should stop polling and reject once the next poll would pass the hard limit', () => {
                repStatus.backoff = { maxIntervalMs: 30000, maxWaitMs: 60000 };
                repStatus.representation.status.state = 'pending';
                const rejectStub = jest.spyOn(repStatus, 'reject').mockImplementation();

                repStatus.handleResponse();
                expect(rejectStub).not.toBeCalled();

                stubs.now.mockReturnValue(58000);
                repStatus.handleResponse();

                expect(getPollDelays(stubs.setTimeout)).toEqual([2000]);
                expect(rejectStub).toBeCalledWith(
                    expect.objectContaining({ code: ERROR_CODE.CONVERSION_TRY_AGAIN_LATER }),
                );
            });
        });

        test('should stop a convert time Timer on success converting', () => {
            repStatus.representation.status.state = STATUS_SUCCESS;
            const tag = Timer.createTag(fileId, LOAD_METRIC.convertTime);
            Timer.start(tag);
            repStatus.handleResponse();

            // Elapsed will not exist if stop isn't called
            expect(Timer.get(tag).elapsed).toBeDefined();
        });

        test('should not stop a convert time Timer on success when the timer is disabled', () => {
            repStatus.enableConvertTimer = false;
            repStatus.representation.status.state = STATUS_SUCCESS;
            const tag = Timer.createTag(fileId, LOAD_METRIC.convertTime);
            Timer.start(tag);
            repStatus.handleResponse();

            // Elapsed will exist only if stop is called
            expect(Timer.get(tag).elapsed).toBeUndefined();
        });
    });

    describe('getPromise()', () => {
        test('handle response and return a promise', () => {
            jest.spyOn(repStatus, 'handleResponse');
            repStatus.promise = 'promise';

            expect(repStatus.getPromise()).toBe('promise');
            expect(repStatus.handleResponse).toBeCalled();
        });
    });
});
