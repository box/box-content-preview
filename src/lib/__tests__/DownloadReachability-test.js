/* eslint-disable no-unused-expressions */
import * as util from '../util';
import Api from '../api';
import DownloadReachability from '../DownloadReachability';

const sandbox = sinon.sandbox.create();

const DOWNLOAD_NOTIFICATION_SHOWN_KEY = 'download_host_notification_shown';
const DOWNLOAD_HOST_FALLBACK_KEY = 'download_host_fallback';

describe('lib/DownloadReachability', () => {
    beforeEach(() => {
        sessionStorage.clear();
        localStorage.clear();
        sandbox.stub(DownloadReachability, 'isStorageAvailable').returns(true);
    });

    afterEach(() => {
        sessionStorage.clear();
        localStorage.clear();
        sandbox.verifyAndRestore();
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

        tests.forEach(testData => {
            it(`should be ${testData.expectedValue} if the url is ${testData.title}`, () => {
                const result = DownloadReachability.isCustomDownloadHost(testData.url);
                expect(result).to.be[testData.expectedValue];
            });
        });
    });

    describe('setDownloadHostNotificationShown()', () => {
        it('should add the given host to the array of shown hosts', () => {
            const blockedHost = 'https://dl3.boxcloud.com';

            DownloadReachability.setDownloadHostNotificationShown(blockedHost);

            const shownHostsArr = JSON.parse(localStorage.getItem(DOWNLOAD_NOTIFICATION_SHOWN_KEY)) || [];
            expect(shownHostsArr).to.contain('https://dl3.boxcloud.com');
        });
    });

    describe('setDownloadHostFallback()', () => {
        it('should set the download host fallback key to be true', () => {
            expect(sessionStorage.getItem(DOWNLOAD_HOST_FALLBACK_KEY)).to.not.equal('true');

            DownloadReachability.setDownloadHostFallback();

            expect(sessionStorage.getItem(DOWNLOAD_HOST_FALLBACK_KEY)).to.equal('true');
        });

        it('should do nothing if we do not have access to session storage', () => {
            DownloadReachability.isStorageAvailable.returns(false);

            expect(sessionStorage.getItem(DOWNLOAD_HOST_FALLBACK_KEY)).to.not.equal('true');
            DownloadReachability.setDownloadHostFallback();
            expect(sessionStorage.getItem(DOWNLOAD_HOST_FALLBACK_KEY)).to.not.equal('true');
        });
    });

    describe('isDownloadHostBlocked()', () => {
        beforeEach(() => {
            sessionStorage.setItem(DOWNLOAD_HOST_FALLBACK_KEY, 'true');
        });
        it('should be true if session storage contains the host blocked key', () => {
            expect(DownloadReachability.isDownloadHostBlocked()).to.be.true;
        });

        it('should return false if we do not have access to session storage', () => {
            DownloadReachability.isStorageAvailable.returns(false);
            expect(DownloadReachability.isDownloadHostBlocked()).to.be.false;
        });
    });

    describe('setDownloadHostNotificationShown()', () => {
        it('should do nothing if we do not have access to local storage', () => {
            DownloadReachability.isStorageAvailable.returns(false);
            DownloadReachability.setDownloadHostNotificationShown('foo');
            expect(localStorage.getItem(DOWNLOAD_NOTIFICATION_SHOWN_KEY)).to.be.null;
        });

        it('should add the shown host to the array of already shown hosts', () => {
            const hostShown = 'www.blockedhost.box.com';
            DownloadReachability.setDownloadHostNotificationShown(hostShown);
            expect(localStorage.getItem(DOWNLOAD_NOTIFICATION_SHOWN_KEY)).to.equal(`["${hostShown}"]`);
        });
    });

    describe('getDownloadNotificationToShow()', () => {
        beforeEach(() => {
            sessionStorage.setItem('download_host_fallback', 'false');
        });

        it('should do nothing if we do not have access to session storage', () => {
            DownloadReachability.isStorageAvailable.returns(false);
            sessionStorage.setItem('download_host_fallback', 'true');
            const result = DownloadReachability.getDownloadNotificationToShow('https://dl5.boxcloud.com');
            expect(result).to.equal(null);
        });

        it('should return true if we do not have an entry for the given host and our session indicates we are falling back to the default host', () => {
            let result = DownloadReachability.getDownloadNotificationToShow('https://foo.com');
            expect(result).to.be.null;

            sessionStorage.setItem('download_host_fallback', 'true');
            result = DownloadReachability.getDownloadNotificationToShow('https://dl5.boxcloud.com');
            expect(result).to.equal('dl5.boxcloud.com');

            const shownHostsArr = ['dl5.boxcloud.com'];
            localStorage.setItem('download_host_notification_shown', JSON.stringify(shownHostsArr));
            result = DownloadReachability.getDownloadNotificationToShow('https://dl5.boxcloud.com');
            expect(result).to.be.null;
        });
    });

    describe('setDownloadReachability()', () => {
        it('should catch an errored response', () => {
            const setDownloadHostFallbackStub = sandbox.stub(DownloadReachability, 'setDownloadHostFallback');
            sandbox.stub(Api.prototype, 'head').rejects(new Error());
            const api = new Api();
            return api.reachability.setDownloadReachability('https://dl3.boxcloud.com').catch(() => {
                expect(setDownloadHostFallbackStub).to.be.called;
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

        it('should download with default host if download host is blocked', () => {
            sandbox.stub(DownloadReachability, 'isDownloadHostBlocked').returns(true);
            sandbox.stub(util, 'openUrlInsideIframe');

            const downloadUrl = 'https://custom.boxcloud.com/blah';
            const expected = 'https://dl.boxcloud.com/blah';

            downloadReachability.downloadWithReachabilityCheck(downloadUrl);

            expect(util.openUrlInsideIframe).to.be.calledWith(expected);
        });

        it('should download with default host if download host is already default', () => {
            sandbox.stub(DownloadReachability, 'isDownloadHostBlocked').returns(false);
            sandbox.stub(DownloadReachability, 'isCustomDownloadHost').returns(false);
            sandbox.stub(util, 'openUrlInsideIframe');

            const downloadUrl = 'https://dl.boxcloud.com/blah';

            downloadReachability.downloadWithReachabilityCheck(downloadUrl);

            expect(util.openUrlInsideIframe).to.be.calledWith(downloadUrl);
        });

        it('should download with the custom download host if host is not blocked', () => {
            sandbox.stub(DownloadReachability, 'isDownloadHostBlocked').returns(false);
            sandbox.stub(DownloadReachability, 'isCustomDownloadHost').returns(true);
            sandbox.stub(util, 'openUrlInsideIframe');

            const downloadUrl = 'https://custom.boxcloud.com/blah';

            downloadReachability.downloadWithReachabilityCheck(downloadUrl);

            expect(util.openUrlInsideIframe).to.be.calledWith(downloadUrl);
        });

        it('should check download reachability for custom host', () => {
            sandbox.stub(DownloadReachability, 'isDownloadHostBlocked').returns(false);
            sandbox.stub(DownloadReachability, 'isCustomDownloadHost').returns(true);
            sandbox.stub(DownloadReachability.prototype, 'setDownloadReachability').returns(Promise.resolve(false));
            sandbox.stub(util, 'openUrlInsideIframe');

            const downloadUrl = 'https://custom.boxcloud.com/blah';

            downloadReachability.downloadWithReachabilityCheck(downloadUrl);

            expect(downloadReachability.setDownloadReachability).to.be.calledWith(downloadUrl);
        });

        it('should retry download with default host if custom host is blocked', done => {
            sandbox.stub(DownloadReachability, 'isDownloadHostBlocked').returns(false);
            sandbox.stub(DownloadReachability, 'isCustomDownloadHost').returns(true);
            sandbox.stub(DownloadReachability.prototype, 'setDownloadReachability').returns(
                new Promise(resolve => {
                    resolve(true);
                    done();
                }),
            );
            sandbox.stub(util, 'openUrlInsideIframe');

            const downloadUrl = 'https://custom.boxcloud.com/blah';
            const defaultDownloadUrl = 'https://dl.boxcloud.com/blah';

            downloadReachability.downloadWithReachabilityCheck(downloadUrl);

            expect(util.openUrlInsideIframe.getCall(0).args[0]).to.equal(downloadUrl);
            expect(util.openUrlInsideIframe.getCall(0).args[1]).to.equal(defaultDownloadUrl);
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

        tests.forEach(testData => {
            it(`should replace host with default: ${testData.title}`, () => {
                expect(
                    DownloadReachability.replaceDownloadHostWithDefault(testData.downloadUrl),
                    testData.expectedResult,
                );
            });
        });
    });
});
