/* eslint-disable no-unused-expressions */
import Browser from '../Browser';

const MIME_H264_BASELINE = 'video/mp4; codecs="avc1.42E01E"';
const MIME_H264_MAIN = 'video/mp4; codecs="avc1.4D401E"';
const MIME_H264_HIGH = 'video/mp4; codecs="avc1.64001E"';
const EXT_LOSE_CONTEXT = 'WEBGL_lose_context';

const sandbox = sinon.sandbox.create();

describe('lib/Browser', () => {
    const USER_AGENT = navigator.userAgent;
    afterEach(() => {
        Browser.overrideUserAgent(USER_AGENT);
        sandbox.verifyAndRestore();
    });

    describe('overrideUserAgent()', () => {
        it('should override the user agent that we cached on startup', () => {
            Browser.overrideUserAgent('my_browser is Opera/09234.2345.22');
            const name = Browser.getName();
            expect(name).to.equal('Opera');
        });

        it('should reset the cached browser name, allowing it to refresh on next getName() call', () => {
            const oldName = Browser.getName();
            Browser.overrideUserAgent('my_browser is OPR/09234.2345.22');
            const newName = Browser.getName();
            expect(newName).to.not.equal(oldName);
        });
    });

    describe('getName()', () => {
        it('should return the browser name without checking user agent, if it has already been cached', () => {
            const userAgentFake = { indexOf: sandbox.stub().returns(1) };
            Browser.overrideUserAgent(userAgentFake);
            Browser.getName();
            Browser.getName();
            Browser.getName();
            Browser.getName();
            expect(userAgentFake.indexOf.callCount).to.equal(1);
        });

        describe('different user agents', () => {
            const dp = [
                { Edge: '... Edge/2.2.2' },
                { Opera: '... OPR/09.98.0' },
                { Opera: '... Opera/08923489.1234' },
                { Chrome: '... Chrome/57.133 ' },
                { Safari: '... Safari/57.36' },
                { Explorer: '... Trident/09.90.90' },
                { Firefox: '... Firefox/1.1.1' }
            ];

            dp.forEach((browser) => {
                const expected = Object.keys(browser)[0];
                it(`should get ${expected} as name for user agent`, () => {
                    Browser.overrideUserAgent(browser[expected]);
                    const name = Browser.getName();
                    expect(name).to.equal(expected);
                });
            });
        });
    });

    describe('canPlayType()', () => {
        it('should return false if the type is not "audio" or "video"', () => {
            const canPlay = Browser.canPlayType('image/jpeg');
            expect(canPlay).to.be.false;
        });

        it('should create an audio tag to test against if the type is "audio"', () => {
            const createStub = sandbox.stub(document, 'createElement').returns({});
            Browser.canPlayType('audio/mp3;');
            expect(createStub).to.be.calledWith('audio');
        });

        it('should create a video tag to test against if the type is "video"', () => {
            const createStub = sandbox.stub(document, 'createElement').returns({});
            Browser.canPlayType('video/avi;');
            expect(createStub).to.be.calledWith('video');
        });

        it('should return true if the media can "maybe" be played', () => {
            sandbox.stub(document, 'createElement').returns({ canPlayType: () => 'maybe' });
            const canPlay = Browser.canPlayType('video/avi', 'maybe');
            expect(canPlay).to.be.true;
        });

        it('should return false if the media can not "maybe" be played', () => {
            sandbox.stub(document, 'createElement').returns({ canPlayType: () => '' });
            const canPlay = Browser.canPlayType('video/avi', 'maybe');
            expect(canPlay).to.be.false;
        });

        it('should return true if the media can "probably" be played', () => {
            sandbox.stub(document, 'createElement').returns({ canPlayType: () => 'probably' });
            const canPlay = Browser.canPlayType('video/avi', 'probably');
            expect(canPlay).to.be.true;
        });

        it('should return false if the media can not "probably" be played', () => {
            sandbox.stub(document, 'createElement').returns({ canPlayType: () => '' });
            const canPlay = Browser.canPlayType('video/avi', 'probably');
            expect(canPlay).to.be.false;
        });

        it('should return false if the media mime type contains "no"', () => {
            sandbox.stub(document, 'createElement').returns({ canPlayType: () => 'no' });
            const canPlay = Browser.canPlayType('video/avi', 'maybe');
            expect(canPlay).to.be.false;
        });
    });

    describe('canPlayH264()', () => {
        it('should return true if we can "maybe" play file type', () => {
            sandbox.stub(document, 'createElement').returns({ canPlayType: () => 'maybe' });
            const canPlay = Browser.canPlayH264('video/avi');
            expect(canPlay).to.be.true;
        });

        it('should return true if we cannot "maybe" play the file type, but can "probably" play it', () => {
            sandbox.stub(document, 'createElement').returns({ canPlayType: () => 'probably' });
            const canPlay = Browser.canPlayH264('video/avi');
            expect(canPlay).to.be.true;
        });

        it('should return false if we cannot play the file type', () => {
            sandbox.stub(document, 'createElement').returns({ canPlayType: () => '' });
            const canPlay = Browser.canPlayH264('video/avi');
            expect(canPlay).to.be.false;
        });
    });

    describe('canPlayH264Baseline()', () => {
        it('should call "canPlayH264" with the MIME_H264_BASELINE mime type', () => {
            const stub = sandbox.stub(Browser, 'canPlayH264');
            Browser.canPlayH264Baseline();
            expect(stub).to.be.calledWith(MIME_H264_BASELINE);
        });
    });

    describe('canPlayH264Main()', () => {
        it('should call "canPlayH264" with the MIME_H264_MAIN mime type', () => {
            const stub = sandbox.stub(Browser, 'canPlayH264');
            Browser.canPlayH264Main();
            expect(stub).to.be.calledWith(MIME_H264_MAIN);
        });
    });

    describe('canPlayH264High()', () => {
        it('should call "canPlayH264" with the MIME_H264_HIGH mime type', () => {
            const stub = sandbox.stub(Browser, 'canPlayH264');
            Browser.canPlayH264High();
            expect(stub).to.be.calledWith(MIME_H264_HIGH);
        });
    });

    describe('canPlayMP3()', () => {
        it('should invoke "canPlayType" with "audio/mpeg" to check if it can "maybe" play', () => {
            const stub = sandbox.stub(Browser, 'canPlayType');
            Browser.canPlayMP3();
            expect(stub).to.be.calledWith('audio/mpeg', 'maybe');
        });

        it('should invoke "canPlayType" to see if it can "probably" play, and cannot "maybe" play', () => {
            const stub = sandbox.stub(Browser, 'canPlayType');
            stub.withArgs('audio/mpeg', 'maybe').returns(false);
            Browser.canPlayMP3();
            expect(stub).to.be.calledWith('audio/mpeg', 'probably');
        });
    });

    describe('canPlayDash()', () => {
        it('should return false if there is no global Media Source', () => {
            global.MediaSource = undefined;
            const canPlay = Browser.canPlayDash();
            expect(canPlay).to.be.false;
        });

        it('should invoke "isTypeSupported" on the media source if there is a Media Source, and can check type', () => {
            global.MediaSource = {
                isTypeSupported: sandbox.stub()
            };
            Browser.canPlayDash();
            expect(global.MediaSource.isTypeSupported).to.be.called;
        });

        it('should invoke "canPlayH264High()" if there is a Media Source, but cannot check type', () => {
            global.MediaSource = {};
            const stub = sandbox.stub(Browser, 'canPlayH264High');
            Browser.canPlayDash();
            expect(stub).to.be.called;
        });
    });

    describe('hasMSE()', () => {
        it('should return true if there is Media Source Extensions support', () => {
            global.MediaSource = {};
            expect(Browser.hasMSE()).to.be.true;
        });

        it('should return false if there is not Media Source Extensions support', () => {
            global.MediaSource = undefined;
            expect(Browser.hasMSE()).to.be.false;
        });
    });

    describe('hasWebGL()', () => {
        const gl = {
            getExtension: () => {}
        };
        afterEach(() => {
            Browser.clearGLContext();
        });

        it('should return false if the webgl context cannot be created', () => {
            sandbox.stub(document, 'createElement').returns({
                getContext: () => null,
                addEventListener: sandbox.stub()
            });
            expect(Browser.hasWebGL()).to.be.false;
        });

        it('should return false if the experimental-webgl context cannot be created', () => {
            const getContextStub = sandbox.stub();
            getContextStub.withArgs('webgl').returns(null);
            getContextStub.withArgs('experimental-webgl').returns(undefined);
            sandbox.stub(document, 'createElement').returns({
                getContext: getContextStub,
                addEventListener: sandbox.stub()
            });
            expect(Browser.hasWebGL()).to.be.false;
        });

        it('should return true if a webgl context can be created', () => {
            sandbox.stub(document, 'createElement').returns({
                getContext: () => gl,
                addEventListener: sandbox.stub()
            });
            expect(Browser.hasWebGL()).to.be.true;
            sandbox.restore();
        });

        it('should only create DOM content on the first call to hasWebGL()', () => {
            const create = sandbox.stub(document, 'createElement').returns({
                getContext: () => gl,
                addEventListener: sandbox.stub()
            });
            Browser.hasWebGL();
            Browser.hasWebGL();
            Browser.hasWebGL();
            Browser.hasWebGL();
            expect(create.callCount).to.equal(1);
        });
    });

    describe('clearGLContext()', () => {
        it('should do nothing if a gl context does not exist', () => {
            const gl = {
                getExtension: sandbox.stub()
            };

            sandbox.stub(document, 'createElement').returns({
                getContext: () => gl,
                addEventListener: () => {}
            });

            // Creation and destruction
            Browser.hasWebGL();
            Browser.clearGLContext();
            // And the call to a null gl context
            Browser.clearGLContext();

            expect(gl.getExtension.callCount).to.equal(1);
        });

        it('should invoke "getExtension()" on the gl context to get the WEBGL_lose_context extension', () => {
            const gl = {
                getExtension: sandbox.stub()
            };

            sandbox.stub(document, 'createElement').returns({
                getContext: () => gl,
                addEventListener: () => {}
            });

            // Creation and destruction
            Browser.hasWebGL();
            Browser.clearGLContext();

            expect(gl.getExtension).to.be.calledWith(EXT_LOSE_CONTEXT);
        });

        it('should invoke "loseContext()" to clean up the webgl context', () => {
            const loseExt = {
                loseContext: sandbox.stub()
            };

            const gl = {
                getExtension: () => loseExt
            };

            sandbox.stub(document, 'createElement').returns({
                getContext: () => gl,
                addEventListener: () => {}
            });

            // Creation and destruction
            Browser.hasWebGL();
            Browser.clearGLContext();

            expect(loseExt.loseContext).to.be.called;
        });
    });

    describe('supportsModel3D()', () => {
        afterEach(() => {
            Browser.clearGLContext();
        });

        it('should return false if WebGL is not supported by the browser', () => {
            sandbox.stub(Browser, 'hasWebGL').returns(false);
            const supports = Browser.supportsModel3D();
            expect(supports).to.be.false;
        });

        it('should return true if Standard Derivatives is supported', () => {
            const gl = {
                getExtension: sandbox.stub().returns({})
            };

            sandbox.stub(document, 'createElement').returns({
                getContext: () => gl,
                addEventListener: () => {}
            });

            const supports = Browser.supportsModel3D();
            expect(supports).to.be.true;
        });

        it('should return false if Standard Derivatives is unsupported', () => {
            const gl = {
                getExtension: sandbox.stub().returns(null)
            };

            sandbox.stub(document, 'createElement').returns({
                getContext: () => gl,
                addEventListener: () => {}
            });

            const supports = Browser.supportsModel3D();
            expect(supports).to.be.false;
        });
    });

    describe('hasFlash()', () => {
        it('should return false if creation of Flash object errors out and no Flash mime type is supported', () => {
            global.ActiveXObject = undefined;
            global.navigator.mimeTypes = [];

            const hasFlash = Browser.hasFlash();
            expect(hasFlash).to.be.false;
        });

        it('should return return true if creation of Flash object fails and Flash mime type is supported', () => {
            global.ActiveXObject = undefined;
            global.navigator.mimeTypes['application/x-shockwave-flash'] = {};

            const hasFlash = Browser.hasFlash();
            expect(hasFlash).to.be.true;
        });

        it('should return true if we can successfully create a Flash Object', () => {
            global.ActiveXObject = function ActiveXObject() {};

            const hasFlash = Browser.hasFlash();
            expect(hasFlash).to.be.true;
        });
    });

    describe('hasSVG()', () => {
        it('should proxy a call to document implementation to check for svg basic structure support', () => {
            const featureCheck = sandbox.stub(document.implementation, 'hasFeature');
            Browser.hasSVG();
            expect(featureCheck).to.be.calledWith('http://www.w3.org/TR/SVG11/feature#BasicStructure', '1.1');
        });
    });

    describe('isMobile()', () => {
        it('should return true if a mobile device', () => {
            Browser.overrideUserAgent('iphone and ipad and iphone');
            const isMobile = Browser.isMobile();
            expect(isMobile).to.be.true;
        });

        it('should return false if not a mobile device', () => {
            Browser.overrideUserAgent('super browser');
            const isMobile = Browser.isMobile();
            expect(isMobile).to.be.false;
        });
    });

    describe('canDownload()', () => {
        it('should return true if the browser is not mobile', () => {
            sandbox.stub(Browser, 'isMobile').returns(false);
            const canDownload = Browser.canDownload();
            expect(canDownload).to.be.true;
        });

        it('should return false if externalHost is present, and mobile', () => {
            sandbox.stub(Browser, 'isMobile').returns(true);
            window.externalHost = {};
            const canDownload = Browser.canDownload();
            expect(canDownload).to.be.false;
            window.externalHost = undefined;
        });

        it('should return false if the browser doesn\'t support downloads, and mobile', () => {
            sandbox.stub(Browser, 'isMobile').returns(true);
            window.externalHost = undefined;
            sandbox.stub(document, 'createElement').withArgs('a').returns({});
            const canDownload = Browser.canDownload();
            expect(canDownload).to.be.false;
        });

        it('should return true if the browser does support downloads, and mobile', () => {
            sandbox.stub(Browser, 'isMobile').returns(true);
            window.externalHost = undefined;
            sandbox.stub(document, 'createElement').withArgs('a').returns({ download: true });
            const canDownload = Browser.canDownload();
            expect(canDownload).to.be.true;
        });
    });

    describe('isIOS()', () => {
        it('should return true if device is on ios', () => {
            Browser.overrideUserAgent('iPhone');
            const ios = Browser.isIOS();
            expect(ios).to.be.true;
        });

        it('should return false if device is not on ios', () => {
            Browser.overrideUserAgent('iPhooney');
            const ios = Browser.isIOS();
            expect(ios).to.be.false;
        });
    });

    describe('isAndroid()', () => {
        it('should return true if device is on android', () => {
            Browser.overrideUserAgent('Android');
            const android = Browser.isAndroid();
            expect(android).to.be.true;
        });

        it('should return false if device is not on android', () => {
            Browser.overrideUserAgent('Anger-oid');
            const android = Browser.isAndroid();
            expect(android).to.be.false;
        });
    });

    describe('isMac()', () => {
        it('should return true if device is a Mac', () => {
            Browser.overrideUserAgent('(Macintosh; Intel Mac OS X 10_10_4)');
            const mac = Browser.isMac();
            expect(mac).to.be.true;
        });

        it('should return false if device is not a Mac', () => {
            Browser.overrideUserAgent('(Windows NT 6.1; Win64; x64; rv:47.0)');
            const mac = Browser.isMac();
            expect(mac).to.be.false;
        });
    });

    describe('hasFontIssue()', () => {
        it('should return true if device is on ios and is OS 10.3.XX', () => {
            Browser.overrideUserAgent('iPhone OS 10_3_90 safari/2');
            const hasIssue = Browser.hasFontIssue();
            expect(hasIssue).to.be.true;
        });

        it('should return false if device is on ios and is not OS 10.3.XX', () => {
            Browser.overrideUserAgent('iPhone OS 10_5_90 safari/2');
            const hasIssue = Browser.hasFontIssue();
            expect(hasIssue).to.be.false;
        });

        it('should return true if device is a Mac running Safari', () => {
            Browser.overrideUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_4) AppleWebKit/600.7.12 (KHTML, like Gecko) Version/8.0.7 Safari/600.7.12');
            const hasIssue = Browser.hasFontIssue();
            expect(hasIssue).to.be.true;
        });

        it('should return false if device is a Mac and not on Safari', () => {
            Browser.overrideUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.90 Safari/537.36');
            const hasIssue = Browser.hasFontIssue();
            expect(hasIssue).to.be.false;
        });
    });
});
