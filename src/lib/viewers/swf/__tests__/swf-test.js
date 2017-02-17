/* eslint-disable no-unused-expressions */
/* global swfobject */
import SWF from '../swf';
import Base from '../../base';

const sandbox = sinon.sandbox.create();
let swf;
let containerEl;

describe('lib/viewers/swf', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/swf/__tests__/swf-test.html');
        containerEl = document.querySelector('.container');
        swf = new SWF({
            file: {
                id: 0,
                permissions: {
                    can_download: true
                }
            },
            container: containerEl,
            representation: {
                content: {
                    url_template: 'foo'
                }
            }
        });
        swf.setup();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        if (swf && typeof swf.destroy === 'function') {
            swf.destroy();
        }
        swf = null;
    });

    describe('load()', () => {
        const baseLoad = Base.prototype.load;
        after(() => {
            Object.defineProperty(Base.prototype, 'load', { value: baseLoad });
        });

        it('should fetch assets and call postload', () => {
            Object.defineProperty(Base.prototype, 'load', { value: sandbox.mock() });

            sandbox.stub(swf, 'loadAssets').returns(Promise.resolve());
            sandbox.stub(swf, 'postLoad');
            sandbox.stub(swf, 'setup');

            return swf.load().then(() => {
                expect(swf.setup).to.be.called;
                expect(swf.postLoad).to.be.called;
            });
        });
    });

    describe('postLoad()', () => {
        it('should call embedSWF', () => {
            const contentUrl = 'someurl';
            sandbox.mock(swfobject).expects('embedSWF').withArgs(contentUrl, 'flash-player', '100%', '100%', '9', null, null, {
                allowfullscreen: 'true',
                allowFullScreen: 'true',
                allownetworking: 'none',
                allowNetworking: 'none',
                allowscriptaccess: 'never',
                allowScriptAccess: 'never',
                wmode: 'transparent'
            }, null, sinon.match.func);
            sandbox.stub(swf, 'createContentUrlWithAuthParams').returns(contentUrl);

            swf.postLoad();
        });
    });

    describe('prefetch()', () => {
        it('should prefetch assets if assets is true', () => {
            sandbox.stub(swf, 'prefetchAssets');
            swf.prefetch({ assets: true });
            expect(swf.prefetchAssets).to.be.called;
        });
    });
});
