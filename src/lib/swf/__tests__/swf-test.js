/* global swfobject */

import SWF from '../swf';

const sandbox = sinon.sandbox.create();
const swfUrl = 'foo';
let swf;

describe('swf.js', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('swf/__tests__/swf-test.html');
        swf = new SWF('.container', {
            file: {
                id: '1'
            }
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();
    });

    it('should load an swf and fire load event', (done) => {
        const spy = sandbox.spy(swfobject, 'embedSWF');

        swf.on('load', () => {
            spy.should.have.been.calledWith(swfUrl, 'flash-player', '100%', '100%', '9', null, null, {
                allowfullscreen: 'true',
                allowFullScreen: 'true',
                allownetworking: 'none',
                allowNetworking: 'none',
                allowscriptaccess: 'never',
                allowScriptAccess: 'never',
                wmode: 'transparent'
            }, null, sinon.match.func);
            done();
        });

        // load the swf
        swf.load(swfUrl);
    });
});
