/* eslint-disable no-unused-expressions */
import * as util from '../util';
import Api from '../api';
import DownloadReachability from '../DownloadReachability';

const DOWNLOAD_NOTIFICATION_SHOWN_KEY = 'download_host_notification_shown';
const DOWNLOAD_HOST_FALLBACK_KEY = 'download_host_fallback';

jest.mock('../util', () => ({
    isLocalStorageAvailable: jest.fn(() => true),
    openUrlInsideIframe: jest.fn(),
}));

describe('lib/DownloadReachability', () => {
    beforeEach(() => {
        jest.spyOn(DownloadReachability, 'isStorageAvailable').mockReturnValue(true);

        localStorage.clear();
        sessionStorage.clear();
    });

    describe('isCustomDownloadHost()', () => {
        const tests = [
            { title: 'number host prefix', url: 'https://dl3.boxcloud.com/foo', expectedValue: true },
            { title: 'default prefix', url: 'https://dl.boxcloud.com/foo', expectedValue: false },
            { title: 'google', url: 'https://www.google.com', expectedValue: false },
            { title: 'has boxcloud domain', url: 'https://kld3lk.boxcloud.com', expectedValue: true },
            { title: 'number host prefix for test', url: 'https://dl3.a.test.org', expectedValue: false },
            { title: 'default prefix for test', url: 'https://dl.a.test.org', expectedValue: false },
            { title: 'dl-hnl for test', url: 'https://dl-hnl.a.test.org', expectedValue: false },
            { title: 'dl-las', url: 'https://dl-las.boxcloud.com', expectedValue: true },
        ];

        tests.forEach(({ expectedValue, title, url }) => {
            test(`should be ${expectedValue} if the url is ${title}`, () => {
                const result = DownloadReachability.isCustomDownloadHost(url);
                expect(result).toBe(expectedValue);
            });
        });
    });

    describe('setDownloadHostNotificationShown()', () => {
        test('should add the given host to the array of shown hosts', () => {
            const blockedHost = 'https://dl3.boxcloud.com';

            DownloadReachability.setDownloadHostNotificationShown(blockedHost);

            const shownHostsArr = JSON.parse(localStorage.getItem(DOWNLOAD_NOTIFICATION_SHOWN_KEY)) || [];
            expect(shownHostsArr).toContain('https://dl3.boxcloud.com');
        });
    });

    describe('setDownloadHostFallback()', () => {
        test('should set the download host fallback key to be true', () => {
            expect(sessionStorage.getItem(DOWNLOAD_HOST_FALLBACK_KEY)).not.toBe('true');

            DownloadReachability.setDownloadHostFallback();

            expect(sessionStorage.getItem(DOWNLOAD_HOST_FALLBACK_KEY)).toBe('true');
        });

        test('should do nothing if we do not have access to session storage', () => {
            DownloadReachability.isStorageAvailable.mockReturnValue(false);

            expect(sessionStorage.getItem(DOWNLOAD_HOST_FALLBACK_KEY)).not.toBe('true');
            DownloadReachability.setDownloadHostFallback();
            expect(sessionStorage.getItem(DOWNLOAD_HOST_FALLBACK_KEY)).not.toBe('true');
        });
    });

    describe('isDownloadHostBlocked()', () => {
        beforeEach(() => {
            sessionStorage.setItem(DOWNLOAD_HOST_FALLBACK_KEY, 'true');
        });
        test('should be true if session storage contains the host blocked key', () => {
            expect(DownloadReachability.isDownloadHostBlocked()).toBe(true);
        });

        test('should return false if we do not have access to session storage', () => {
            DownloadReachability.isStorageAvailable.mockReturnValue(false);
            expect(DownloadReachability.isDownloadHostBlocked()).toBe(false);
        });
    });

    describe('setDownloadHostNotificationShown()', () => {
        test('should do nothing if we do not have access to local storage', () => {
            DownloadReachability.isStorageAvailable.mockReturnValue(false);
            DownloadReachability.setDownloadHostNotificationShown('foo');
            expect(localStorage.getItem(DOWNLOAD_NOTIFICATION_SHOWN_KEY)).toBeNull();
        });

        test('should add the shown host to the array of already shown hosts', () => {
            const hostShown = 'www.blockedhost.box.com';
            DownloadReachability.setDownloadHostNotificationShown(hostShown);
            expect(localStorage.getItem(DOWNLOAD_NOTIFICATION_SHOWN_KEY)).toBe(`["${hostShown}"]`);
        });
    });

    describe('getDownloadNotificationToShow()', () => {
        beforeEach(() => {
            sessionStorage.setItem('download_host_fallback', 'false');
        });

        test('should do nothing if we do not have access to session storage', () => {
            DownloadReachability.isStorageAvailable.mockReturnValue(false);
            sessionStorage.setItem('download_host_fallback', 'true');
            const result = DownloadReachability.getDownloadNotificationToShow('https://dl5.boxcloud.com');
            expect(result).toBeNull();
        });

        test('should return true if we do not have an entry for the given host and our session indicates we are falling back to the default host', () => {
            let result = DownloadReachability.getDownloadNotificationToShow('https://foo.com');
            expect(result).toBeNull();

            sessionStorage.setItem('download_host_fallback', 'true');
            result = DownloadReachability.getDownloadNotificationToShow('https://dl5.boxcloud.com');
            expect(result).toBe('dl5.boxcloud.com');

            const shownHostsArr = ['dl5.boxcloud.com'];
            localStorage.setItem('download_host_notification_shown', JSON.stringify(shownHostsArr));
            result = DownloadReachability.getDownloadNotificationToShow('https://dl5.boxcloud.com');
            expect(result).toBeNull();
        });
    });

    describe('setDownloadReachability()', () => {
        test('should catch an errored response', () => {
            const setDownloadHostFallbackStub = jest.spyOn(DownloadReachability, 'setDownloadHostFallback');
            const downloadReachability = new DownloadReachability({
                head: jest.fn().mockRejectedValue(new Error()),
            });

            return downloadReachability.setDownloadReachability('https://dl3.boxcloud.com').catch(() => {
                expect(setDownloadHostFallbackStub).toBeCalled();
            });
        });
    });

    describe('downloadWithReachabilityCheck()', () => {
        let downloadReachability;

        beforeEach(() => {
            downloadReachability = new DownloadReachability(new Api());
        });

        afterEach(() => {
            downloadReachability = undefined;
        });

        test('should download with default host if download host is blocked', () => {
            jest.spyOn(DownloadReachability, 'isDownloadHostBlocked').mockReturnValue(true);

            const downloadUrl = 'https://custom.boxcloud.com/blah';
            const expected = 'https://dl.boxcloud.com/blah';

            downloadReachability.downloadWithReachabilityCheck(downloadUrl);

            expect(util.openUrlInsideIframe).toBeCalledWith(expected);
        });

        test('should download with default host if download host is already default', () => {
            jest.spyOn(DownloadReachability, 'isDownloadHostBlocked').mockReturnValue(false);
            jest.spyOn(DownloadReachability, 'isCustomDownloadHost').mockReturnValue(false);

            const downloadUrl = 'https://dl.boxcloud.com/blah';

            downloadReachability.downloadWithReachabilityCheck(downloadUrl);

            expect(util.openUrlInsideIframe).toBeCalledWith(downloadUrl);
        });

        test('should download with the custom download host if host is not blocked', () => {
            jest.spyOn(DownloadReachability, 'isDownloadHostBlocked').mockReturnValue(false);
            jest.spyOn(DownloadReachability, 'isCustomDownloadHost').mockReturnValue(true);

            const downloadUrl = 'https://custom.boxcloud.com/blah';

            downloadReachability.downloadWithReachabilityCheck(downloadUrl);

            expect(util.openUrlInsideIframe).toBeCalledWith(downloadUrl);
        });

        test('should check download reachability for custom host', () => {
            jest.spyOn(DownloadReachability, 'isDownloadHostBlocked').mockReturnValue(false);
            jest.spyOn(DownloadReachability, 'isCustomDownloadHost').mockReturnValue(true);
            jest.spyOn(downloadReachability, 'setDownloadReachability').mockResolvedValue(false);

            const downloadUrl = 'https://custom.boxcloud.com/blah';

            downloadReachability.downloadWithReachabilityCheck(downloadUrl);

            expect(downloadReachability.setDownloadReachability).toBeCalledWith(downloadUrl);
        });
    });

    describe('replaceDownloadHostWithDefault()', () => {
        const tests = [
            {
                title: 'numbered host',
                downloadUrl: 'https://dl3.boxcloud.com',
                expectedResult: 'https://dl.boxcloud.com',
            },
            {
                title: 'two digit numbered host',
                downloadUrl: 'https://dl34.boxcloud.com',
                expectedResult: 'https://dl.boxcloud.com',
            },
            { title: 'google', downloadUrl: 'https://www.google.com', expectedResult: 'https://dl.google.com' },
            { title: 'aws', downloadUrl: 'https://kld3lk.boxcloud.com', expectedResult: 'https://dl.boxcloud.com' },
            { title: 'test', downloadUrl: 'https://dl3.a.test.org', expectedResult: 'https://dl.a.test.org' },
            { title: 'dl-las', downloadUrl: 'https://dl-las.boxcloud.com', expectedResult: 'https://dl.boxcloud.com' },
        ];

        tests.forEach(({ downloadUrl, expectedResult, title }) => {
            test(`should replace host with default: ${title}`, () => {
                expect(DownloadReachability.replaceDownloadHostWithDefault(downloadUrl)).toBe(expectedResult);
            });
        });
    });
});
