/* eslint-disable no-unused-expressions */
import Browser from '../Browser';

const MIME_H264_BASELINE = 'video/mp4; codecs="avc1.42E01E"';
const MIME_H264_MAIN = 'video/mp4; codecs="avc1.4D401E"';
const MIME_H264_HIGH = 'video/mp4; codecs="avc1.64001E"';
const EXT_LOSE_CONTEXT = 'WEBGL_lose_context';

const sandbox = sinon.createSandbox();
const USER_AGENT = navigator.userAgent;

describe('lib/Browser', () => {
    afterEach(() => {
        Browser.overrideUserAgent(USER_AGENT);
        sandbox.verifyAndRestore();
    });

    describe('overrideUserAgent()', () => {
        test('should override the user agent that we cached on startup', () => {
            Browser.overrideUserAgent('my_browser is Opera/09234.2345.22');
            const name = Browser.getName();
            expect(name).toBe('Opera');
        });

        test('should reset the cached browser name, allowing it to refresh on next getName() call', () => {
            const oldName = Browser.getName();
            Browser.overrideUserAgent('my_browser is OPR/09234.2345.22');
            const newName = Browser.getName();
            expect(newName).not.toBe(oldName);
        });
    });

    describe('getName()', () => {
        test('should return the browser name without checking user agent, if it has already been cached', () => {
            const userAgentFake = { indexOf: jest.fn(() => 1) };
            Browser.overrideUserAgent(userAgentFake);
            Browser.getName();
            Browser.getName();
            Browser.getName();
            Browser.getName();
            expect(userAgentFake.indexOf).toBeCalledTimes(1);
        });

        describe('different user agents', () => {
            const dp = [
                { Edge: '... Edge/2.2.2' },
                { Opera: '... OPR/09.98.0' },
                { Opera: '... Opera/08923489.1234' },
                { Chrome: '... Chrome/57.133 ' },
                { Safari: '... Safari/57.36' },
                { Explorer: '... Trident/09.90.90' },
                { Firefox: '... Firefox/1.1.1' },
            ];

            dp.forEach(browser => {
                const expected = Object.keys(browser)[0];
                test(`should get ${expected} as name for user agent`, () => {
                    Browser.overrideUserAgent(browser[expected]);
                    const name = Browser.getName();
                    expect(name).toBe(expected);
                });
            });
        });
    });

    describe('canPlayType()', () => {
        test('should return false if the type is not "audio" or "video"', () => {
            const canPlay = Browser.canPlayType('image/jpeg');
            expect(canPlay).toBe(false);
        });

        test('should create an audio tag to test against if the type is "audio"', () => {
            const createStub = jest.spyOn(document, 'createElement').mockReturnValue({});
            Browser.canPlayType('audio/mp3;');
            expect(createStub).toBeCalledWith('audio');
        });

        test('should create a video tag to test against if the type is "video"', () => {
            const createStub = jest.spyOn(document, 'createElement').mockReturnValue({});
            Browser.canPlayType('video/avi;');
            expect(createStub).toBeCalledWith('video');
        });

        test('should return true if the media can "maybe" be played', () => {
            jest.spyOn(document, 'createElement').mockReturnValue({ canPlayType: () => 'maybe' });
            const canPlay = Browser.canPlayType('video/avi', 'maybe');
            expect(canPlay).toBe(true);
        });

        test('should return false if the media can not "maybe" be played', () => {
            jest.spyOn(document, 'createElement').mockReturnValue({ canPlayType: () => '' });
            const canPlay = Browser.canPlayType('video/avi', 'maybe');
            expect(canPlay).toBe(false);
        });

        test('should return true if the media can "probably" be played', () => {
            jest.spyOn(document, 'createElement').mockReturnValue({ canPlayType: () => 'probably' });
            const canPlay = Browser.canPlayType('video/avi', 'probably');
            expect(canPlay).toBe(true);
        });

        test('should return false if the media can not "probably" be played', () => {
            jest.spyOn(document, 'createElement').mockReturnValue({ canPlayType: () => '' });
            const canPlay = Browser.canPlayType('video/avi', 'probably');
            expect(canPlay).toBe(false);
        });

        test('should return false if the media mime type contains "no"', () => {
            jest.spyOn(document, 'createElement').mockReturnValue({ canPlayType: () => 'no' });
            const canPlay = Browser.canPlayType('video/avi', 'maybe');
            expect(canPlay).toBe(false);
        });
    });

    describe('canPlayH264()', () => {
        test('should return true if we can "maybe" play file type', () => {
            jest.spyOn(document, 'createElement').mockReturnValue({ canPlayType: () => 'maybe' });
            const canPlay = Browser.canPlayH264('video/avi');
            expect(canPlay).toBe(true);
        });

        test('should return true if we cannot "maybe" play the file type, but can "probably" play it', () => {
            jest.spyOn(document, 'createElement').mockReturnValue({ canPlayType: () => 'probably' });
            const canPlay = Browser.canPlayH264('video/avi');
            expect(canPlay).toBe(true);
        });

        test('should return false if we cannot play the file type', () => {
            jest.spyOn(document, 'createElement').mockReturnValue({ canPlayType: () => '' });
            const canPlay = Browser.canPlayH264('video/avi');
            expect(canPlay).toBe(false);
        });
    });

    describe('canPlayH264Baseline()', () => {
        test('should call "canPlayH264" with the MIME_H264_BASELINE mime type', () => {
            const stub = jest.spyOn(Browser, 'canPlayH264');
            Browser.canPlayH264Baseline();
            expect(stub).toBeCalledWith(MIME_H264_BASELINE);
        });
    });

    describe('canPlayH264Main()', () => {
        test('should call "canPlayH264" with the MIME_H264_MAIN mime type', () => {
            const stub = jest.spyOn(Browser, 'canPlayH264');
            Browser.canPlayH264Main();
            expect(stub).toBeCalledWith(MIME_H264_MAIN);
        });
    });

    describe('canPlayH264High()', () => {
        test('should call "canPlayH264" with the MIME_H264_HIGH mime type', () => {
            const stub = jest.spyOn(Browser, 'canPlayH264');
            Browser.canPlayH264High();
            expect(stub).toBeCalledWith(MIME_H264_HIGH);
        });
    });

    describe('canPlayMP3()', () => {
        test('should invoke "canPlayType" with "audio/mpeg" to check if it can "maybe" play', () => {
            const stub = jest.spyOn(Browser, 'canPlayType');
            Browser.canPlayMP3();
            expect(stub).toBeCalledWith('audio/mpeg', 'maybe');
        });

        test('should invoke "canPlayType" to see if it can "probably" play, and cannot "maybe" play', () => {
            const stub = jest.spyOn(Browser, 'canPlayType').mockReturnValue(false);
            Browser.canPlayMP3();
            expect(stub).toBeCalledWith('audio/mpeg', 'probably');
        });
    });

    describe('canPlayDash()', () => {
        test('should return false if there is no global Media Source', () => {
            global.MediaSource = undefined;
            const canPlay = Browser.canPlayDash();
            expect(canPlay).toBe(false);
        });

        test('should invoke "isTypeSupported" on the media source if there is a Media Source, and can check type', () => {
            global.MediaSource = {
                isTypeSupported: jest.fn(),
            };
            Browser.canPlayDash();
            expect(global.MediaSource.isTypeSupported).toBeCalled();
        });

        test('should invoke "canPlayH264High()" if there is a Media Source, but cannot check type', () => {
            global.MediaSource = {};
            const stub = jest.spyOn(Browser, 'canPlayH264High');
            Browser.canPlayDash();
            expect(stub).toBeCalled();
        });
    });

    describe('hasMSE()', () => {
        test('should return true if there is Media Source Extensions support', () => {
            global.MediaSource = {};
            expect(Browser.hasMSE()).toBe(true);
        });

        test('should return false if there is not Media Source Extensions support', () => {
            global.MediaSource = undefined;
            expect(Browser.hasMSE()).toBe(false);
        });
    });

    describe('hasWebGL()', () => {
        const gl = {
            getExtension: () => {},
        };
        afterEach(() => {
            Browser.clearGLContext();
        });

        test('should return false if the webgl context cannot be created', () => {
            jest.spyOn(document, 'createElement').mockReturnValue({
                getContext: () => null,
                addEventListener: jest.fn(),
            });
            expect(Browser.hasWebGL()).toBe(false);
        });

        test('should return false if the experimental-webgl context cannot be created', () => {
            const getContextStub = sandbox.stub();
            getContextStub.withArgs('webgl').returns(null);
            getContextStub.withArgs('experimental-webgl').returns(undefined);
            jest.spyOn(document, 'createElement').mockReturnValue({
                getContext: getContextStub,
                addEventListener: jest.fn(),
            });
            expect(Browser.hasWebGL()).toBe(false);
        });

        test('should return true if a webgl context can be created', () => {
            jest.spyOn(document, 'createElement').mockReturnValue({
                getContext: () => gl,
                addEventListener: jest.fn(),
            });
            expect(Browser.hasWebGL()).toBe(true);
            sandbox.restore();
        });

        test('should only create DOM content on the first call to hasWebGL()', () => {
            const create = jest.spyOn(document, 'createElement').mockReturnValue({
                getContext: () => gl,
                addEventListener: jest.fn(),
            });
            Browser.hasWebGL();
            Browser.hasWebGL();
            Browser.hasWebGL();
            Browser.hasWebGL();
            expect(create).toBeCalledTimes(1);
        });
    });

    describe('clearGLContext()', () => {
        test('should do nothing if a gl context does not exist', () => {
            const gl = {
                getExtension: jest.fn(),
            };

            jest.spyOn(document, 'createElement').mockReturnValue({
                getContext: () => gl,
                addEventListener: () => {},
            });

            // Creation and destruction
            Browser.hasWebGL();
            Browser.clearGLContext();
            // And the call to a null gl context
            Browser.clearGLContext();

            expect(gl.getExtension).toBeCalledTimes(1);
        });

        test('should invoke "getExtension()" on the gl context to get the WEBGL_lose_context extension', () => {
            const gl = {
                getExtension: jest.fn(),
            };

            jest.spyOn(document, 'createElement').mockReturnValue({
                getContext: () => gl,
                addEventListener: () => {},
            });

            // Creation and destruction
            Browser.hasWebGL();
            Browser.clearGLContext();

            expect(gl.getExtension).toBeCalledWith(EXT_LOSE_CONTEXT);
        });

        test('should invoke "loseContext()" to clean up the webgl context', () => {
            const loseExt = {
                loseContext: jest.fn(),
            };

            const gl = {
                getExtension: () => loseExt,
            };

            jest.spyOn(document, 'createElement').mockReturnValue({
                getContext: () => gl,
                addEventListener: () => {},
            });

            // Creation and destruction
            Browser.hasWebGL();
            Browser.clearGLContext();

            expect(loseExt.loseContext).toBeCalled();
        });
    });

    describe('supportsModel3D()', () => {
        afterEach(() => {
            Browser.clearGLContext();
        });

        test('should return false if WebGL is not supported by the browser', () => {
            jest.spyOn(Browser, 'hasWebGL').mockReturnValue(false);
            const supports = Browser.supportsModel3D();
            expect(supports).toBe(false);
        });

        test('should return true if Standard Derivatives is supported', () => {
            const gl = {
                getExtension: jest.fn(() => ({})),
            };

            jest.spyOn(document, 'createElement').mockReturnValue({
                getContext: () => gl,
                addEventListener: () => {},
            });

            const supports = Browser.supportsModel3D();
            expect(supports).toBe(true);
        });

        test('should return false if Standard Derivatives is unsupported', () => {
            const gl = {
                getExtension: jest.fn(() => null),
            };

            jest.spyOn(document, 'createElement').mockReturnValue({
                getContext: () => gl,
                addEventListener: () => {},
            });

            const supports = Browser.supportsModel3D();
            expect(supports).toBe(false);
        });
    });

    describe('hasFlash()', () => {
        test('should return false if creation of Flash object errors out and no Flash mime type is supported', () => {
            global.ActiveXObject = undefined;
            global.navigator.mimeTypes = [];

            const hasFlash = Browser.hasFlash();
            expect(hasFlash).toBe(false);
        });

        test('should return return true if creation of Flash object fails and Flash mime type is supported', () => {
            global.ActiveXObject = undefined;
            global.navigator.mimeTypes['application/x-shockwave-flash'] = {};

            const hasFlash = Browser.hasFlash();
            expect(hasFlash).toBe(true);
        });

        test('should return true if we can successfully create a Flash Object', () => {
            global.ActiveXObject = function ActiveXObject() {};

            const hasFlash = Browser.hasFlash();
            expect(hasFlash).toBe(true);
        });
    });

    describe('hasSVG()', () => {
        test('should proxy a call to document implementation to check for svg basic structure support', () => {
            const featureCheck = jest.spyOn(document.implementation, 'hasFeature');
            Browser.hasSVG();
            expect(featureCheck).toBeCalledWith('http://www.w3.org/TR/SVG11/feature#BasicStructure', '1.1');
        });
    });

    describe('isMobile()', () => {
        test('should return true if a mobile device', () => {
            Browser.overrideUserAgent('iphone and ipad and iphone');
            const isMobile = Browser.isMobile();
            expect(isMobile).toBe(true);
        });

        test('should return false if not a mobile device', () => {
            Browser.overrideUserAgent('super browser');
            const isMobile = Browser.isMobile();
            expect(isMobile).toBe(false);
        });
    });

    describe('canDownload()', () => {
        test('should return true if the browser is not mobile', () => {
            jest.spyOn(Browser, 'isMobile').mockReturnValue(false);
            const canDownload = Browser.canDownload();
            expect(canDownload).toBe(true);
        });

        test('should return false if externalHost is present, and mobile', () => {
            jest.spyOn(Browser, 'isMobile').mockReturnValue(true);
            window.externalHost = {};
            const canDownload = Browser.canDownload();
            expect(canDownload).toBe(false);
            window.externalHost = undefined;
        });

        test("should return false if the browser doesn't support downloads, and mobile", () => {
            jest.spyOn(Browser, 'isMobile').mockReturnValue(true);
            window.externalHost = undefined;
            sandbox
                .stub(document, 'createElement')
                .withArgs('a')
                .returns({});
            const canDownload = Browser.canDownload();
            expect(canDownload).toBe(false);
        });

        test('should return true if the browser does support downloads, and mobile', () => {
            jest.spyOn(Browser, 'isMobile').mockReturnValue(true);
            window.externalHost = undefined;
            sandbox
                .stub(document, 'createElement')
                .withArgs('a')
                .returns({ download: true });
            const canDownload = Browser.canDownload();
            expect(canDownload).toBe(true);
        });
    });

    describe('isIOS()', () => {
        test('should return true if device is on ios', () => {
            Browser.overrideUserAgent('iPhone');
            const ios = Browser.isIOS();
            expect(ios).toBe(true);
        });

        test('should return false if device is not on ios', () => {
            Browser.overrideUserAgent('iPhooney');
            const ios = Browser.isIOS();
            expect(ios).toBe(false);
        });
    });

    describe('isAndroid()', () => {
        test('should return true if device is on android', () => {
            Browser.overrideUserAgent('Android');
            const android = Browser.isAndroid();
            expect(android).toBe(true);
        });

        test('should return false if device is not on android', () => {
            Browser.overrideUserAgent('Anger-oid');
            const android = Browser.isAndroid();
            expect(android).toBe(false);
        });
    });

    describe('hasFontIssue()', () => {
        test('should return true if device is on ios and is OS 10.3.XX', () => {
            Browser.overrideUserAgent('iPhone OS 10_3_90 safari/2');
            const hasIssue = Browser.hasFontIssue();
            expect(hasIssue).toBe(true);
        });

        test('should return false if device is on ios and is not OS 10.3.XX', () => {
            Browser.overrideUserAgent('iPhone OS 10_5_90 safari/2');
            const hasIssue = Browser.hasFontIssue();
            expect(hasIssue).toBe(false);
        });
    });

    describe('getBrowserInfo()', () => {
        test('should return browser capabilities', () => {
            const browserInfo = Browser.getBrowserInfo();
            const expectedFields = ['name', 'swf', 'svg', 'mse', 'mp3', 'dash', 'h264'];

            expect(expectedFields.every(field => typeof browserInfo[field] !== 'undefined')).toBe(true);
        });
    });
});
