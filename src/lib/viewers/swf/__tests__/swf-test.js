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
                status: {
                    getPromise: () => Promise.resolve(),
                    destroy: sandbox.stub()
                },
                data: {
                    content: {
                        url_template: 'foo'
                    }
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

    describe('prefetch()', () => {
        it('should load assets', () => {
            sandbox.stub(swf, 'prefetchAssets');
            swf.prefetch();
            expect(swf.prefetchAssets).to.have.been.called;
        });
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
                expect(swf.setup).to.have.been.called;
                expect(swf.postLoad).to.have.been.called;
            });
        });
    });

    describe('postLoad()', () => {
        it('should call embedSWF', () => {
            const spy = sandbox.spy(swfobject, 'embedSWF');
            swf.postLoad();
            spy.should.have.been.calledWith('foo', 'flash-player', '100%', '100%', '9', null, null, {
                allowfullscreen: 'true',
                allowFullScreen: 'true',
                allownetworking: 'none',
                allowNetworking: 'none',
                allowscriptaccess: 'never',
                allowScriptAccess: 'never',
                wmode: 'transparent'
            }, null, sinon.match.func);
        });
    });
});
