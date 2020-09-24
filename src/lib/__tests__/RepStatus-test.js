/* eslint-disable no-unused-expressions */
import * as util from '../util';
import Api from '../api';
import RepStatus from '../RepStatus';
import { LOAD_METRIC } from '../events';
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

    describe('constructor()', () => {
        const infoUrl = 'someUrl';

        beforeEach(() => {
            jest.spyOn(util, 'appendAuthParams').mockReturnValue(infoUrl);
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
        });
    });

    describe('destroy()', () => {
        test('should clear the status timeout', () => {
            sandbox.mock(window).expects('clearTimeout');
            repStatus.destroy();
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

        test('should stop a convert time Timer on success converting', () => {
            repStatus.representation.status.state = STATUS_SUCCESS;
            const tag = Timer.createTag(fileId, LOAD_METRIC.convertTime);
            Timer.start(tag);
            repStatus.handleResponse();

            // Elapsed will not exist if stop isn't called
            expect(Timer.get(tag).elapsed).toBeDefined();
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
