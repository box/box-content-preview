/* eslint-disable no-unused-expressions */
import 'whatwg-fetch';
import fetchMock from 'fetch-mock';
import * as dr from '../downloadReachability';

const sandbox = sinon.sandbox.create();

const DEFAULT_DOWNLOAD_HOST_PREFIX = 'https://dl.';
const DOWNLOAD_NOTIFICATION_SHOWN_KEY = 'download_host_notification_shown';
const DOWNLOAD_HOST_FALLBACK_KEY = 'download_host_fallback';

describe('lib/downloadReachability', () => {
    beforeEach(() => {
        sessionStorage.clear();
        localStorage.clear();

    });
    
    afterEach(() => {
        sessionStorage.clear();
        localStorage.clear();
        sandbox.verifyAndRestore();

    });
    
    describe('isCustomDownloadHost()', () => {
        it('should be true if the url does not start with the default host prefix but is a dl host', () => {
            let url = 'https://dl3.boxcloud.com/foo';
            let result = dr.isCustomDownloadHost(url)
            expect(result).to.be.true;

            url = 'https://dl.boxcloud.com/foo';
            expect(dr.isCustomDownloadHost(url)).to.be.false;

            url = 'https://www.google.com';
            expect(dr.isCustomDownloadHost(url)).to.be.false;
        });
    });

    describe('replaceDownloadHostWithDefault()', () => {
        it('should add the given host to the array of shown hosts', () => {
            const blockedHost = 'https://dl3.boxcloud.com';

            const result = dr.setDownloadHostNotificationShown(blockedHost);

            const shownHostsArr = JSON.parse(localStorage.getItem(DOWNLOAD_NOTIFICATION_SHOWN_KEY)) || [];
            expect(shownHostsArr).to.contain('https://dl3.boxcloud.com');
        });
    });
        
    describe('setDownloadHostFallback()', () => {
        it('should set the download host fallback key to be true', () => {
            expect(sessionStorage.getItem(DOWNLOAD_HOST_FALLBACK_KEY) === 'true').to.be.false;

            dr.setDownloadHostFallback();

            expect(sessionStorage.getItem(DOWNLOAD_HOST_FALLBACK_KEY) === 'true').to.be.true;

        });
    });

    describe('isDownloadHostBlocked()', () => {
        it('should set the download host fallback key to be true', () => {
            expect(dr.isDownloadHostBlocked()).to.be.false;

            dr.setDownloadHostFallback();

            expect(dr.isDownloadHostBlocked()).to.be.true;
        });
    });

    describe('setDownloadHostNotificationShown()', () => {
        it('should set the download host fallback key to be true', () => {
            expect(dr.isDownloadHostBlocked()).to.be.false;

            dr.setDownloadHostFallback();

            expect(dr.isDownloadHostBlocked()).to.be.true;
        });
    });

    describe('downloadNotificationToShow()', () => {
        beforeEach(() => {
            sessionStorage.setItem('download_host_fallback', 'false');
        });

        it('should return true if we do not have an entry for the given host and our session indicates we are falling back to the default host', () => {
            let result = dr.downloadNotificationToShow();
            expect(result).to.be.undefined;;

            sessionStorage.setItem('download_host_fallback', 'true');
            result = dr.downloadNotificationToShow('https://dl5.boxcloud.com');
            expect(result).to.equal('dl5.boxcloud.com');
        
            const shownHostsArr = ['dl5.boxcloud.com'];
            localStorage.setItem('download_host_notification_shown', JSON.stringify(shownHostsArr));
            result = dr.downloadNotificationToShow(shownHostsArr[0]);
            expect(result).to.be.undefined;

        });
    });


    describe('setDownloadReachability()', () => {
        afterEach(() => {
            fetchMock.restore();
        })
        it('should catch an errored response', () => {
            const setDownloadHostFallbackStub = sandbox.stub(dr, 'setDownloadHostFallback');
            fetchMock.head('https://dl3.boxcloud.com', {throws: new Error('woohoo')})

            return dr.setDownloadReachability('https://dl3.boxcloud.com').catch(() => {
                expect(setDownloadHostFallbackStub).to.be.called;
            })



        });
    });




});