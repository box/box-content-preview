/* eslint-disable no-unused-expressions */
import 'whatwg-fetch';
import fetchMock from 'fetch-mock';
import DownloadReachability from '../DownloadReachability';
import * as util from '../util';

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
        it('should be true if the url does not start with the default host prefix but is a dl host', () => {
            let url = 'https://dl3.boxcloud.com/foo';
            const result = DownloadReachability.isCustomDownloadHost(url);
            expect(result).to.be.true;

            url = 'https://dl.boxcloud.com/foo';
            expect(DownloadReachability.isCustomDownloadHost(url)).to.be.false;

            url = 'https://www.google.com';
            expect(DownloadReachability.isCustomDownloadHost(url)).to.be.false;

            url = 'https://kld3lk.boxcloud.com';
            expect(DownloadReachability.isCustomDownloadHost(url)).to.be.true;

            url = 'https://dl3.user.inside-box.net';
            expect(DownloadReachability.isCustomDownloadHost(url)).to.be.true;

            url = 'https://dl.user.inside-box.net';
            expect(DownloadReachability.isCustomDownloadHost(url)).to.be.false;
        });
    });

    describe('replaceDownloadHostWithDefault()', () => {
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
    });

    describe('isDownloadHostBlocked()', () => {
        it('should set the download host fallback key to be true', () => {
            expect(DownloadReachability.isDownloadHostBlocked()).to.be.false;

            DownloadReachability.setDownloadHostFallback();

            expect(DownloadReachability.isDownloadHostBlocked()).to.be.true;
        });
    });

    describe('setDownloadHostNotificationShown()', () => {
        it('should set the download host fallback key to be true', () => {
            expect(DownloadReachability.isDownloadHostBlocked()).to.be.false;

            DownloadReachability.setDownloadHostFallback();

            expect(DownloadReachability.isDownloadHostBlocked()).to.be.true;
        });
    });

    describe('getDownloadNotificationToShow()', () => {
        beforeEach(() => {
            sessionStorage.setItem('download_host_fallback', 'false');
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
        afterEach(() => {
            fetchMock.restore();
        });
        it('should catch an errored response', () => {
            const setDownloadHostFallbackStub = sandbox.stub(DownloadReachability, 'setDownloadHostFallback');
            fetchMock.head('https://dl3.boxcloud.com', { throws: new Error() });

            return DownloadReachability.setDownloadReachability('https://dl3.boxcloud.com').catch(() => {
                expect(setDownloadHostFallbackStub).to.be.called;
            });
        });
    });

    describe('downloadWithReachabilityCheck()', () => {
        it('should download with default host if download host is blocked', () => {
            sandbox.stub(DownloadReachability, 'isDownloadHostBlocked').returns(true);
            sandbox.stub(util, 'openUrlInsideIframe');

            const downloadUrl = 'https://custom.boxcloud.com/blah';
            const expected = 'https://dl.boxcloud.com/blah';

            DownloadReachability.downloadWithReachabilityCheck(downloadUrl);

            expect(util.openUrlInsideIframe).to.be.calledWith(expected);
        });

        it('should download with default host if download host is already default', () => {
            sandbox.stub(DownloadReachability, 'isDownloadHostBlocked').returns(false);
            sandbox.stub(DownloadReachability, 'isCustomDownloadHost').returns(false);
            sandbox.stub(util, 'openUrlInsideIframe');

            const downloadUrl = 'https://dl.boxcloud.com/blah';

            DownloadReachability.downloadWithReachabilityCheck(downloadUrl);

            expect(util.openUrlInsideIframe).to.be.calledWith(downloadUrl);
        });

        it('should download with the custom download host if host is not blocked', () => {
            sandbox.stub(DownloadReachability, 'isDownloadHostBlocked').returns(false);
            sandbox.stub(DownloadReachability, 'isCustomDownloadHost').returns(true);
            sandbox.stub(util, 'openUrlInsideIframe');

            const downloadUrl = 'https://custom.boxcloud.com/blah';

            DownloadReachability.downloadWithReachabilityCheck(downloadUrl);

            expect(util.openUrlInsideIframe).to.be.calledWith(downloadUrl);
        });

        it('should check download reachability for custom host', () => {
            sandbox.stub(DownloadReachability, 'isDownloadHostBlocked').returns(false);
            sandbox.stub(DownloadReachability, 'isCustomDownloadHost').returns(true);
            sandbox.stub(DownloadReachability, 'setDownloadReachability').returns(Promise.resolve(false));
            sandbox.stub(util, 'openUrlInsideIframe');

            const downloadUrl = 'https://custom.boxcloud.com/blah';

            DownloadReachability.downloadWithReachabilityCheck(downloadUrl);

            expect(DownloadReachability.setDownloadReachability).to.be.calledWith(downloadUrl);
        });

        it('should retry download with default host if custom host is blocked', (done) => {
            sandbox.stub(DownloadReachability, 'isDownloadHostBlocked').returns(false);
            sandbox.stub(DownloadReachability, 'isCustomDownloadHost').returns(true);
            sandbox.stub(DownloadReachability, 'setDownloadReachability').returns(
                new Promise((resolve) => {
                    resolve(true);
                    done();
                })
            );
            sandbox.stub(util, 'openUrlInsideIframe');

            const downloadUrl = 'https://custom.boxcloud.com/blah';
            const defaultDownloadUrl = 'https://dl.boxcloud.com/blah';

            DownloadReachability.downloadWithReachabilityCheck(downloadUrl);

            expect(util.openUrlInsideIframe.getCall(0).args[0]).to.equal(downloadUrl);
            expect(util.openUrlInsideIframe.getCall(0).args[1]).to.equal(defaultDownloadUrl);
        });
    });
});
