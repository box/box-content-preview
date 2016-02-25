import SWF from '../swf';

let sandbox = sinon.sandbox.create();
let swfUrl = 'foo';
let swf;

describe('swf.js', function() {

    before(function() {
        fixture.setBase('src/js');
    });

    beforeEach(function() {
        fixture.load('swf/__tests__/swf-test.html');
        swf = new SWF('.container');
    });

    afterEach(function() {
        sandbox.verifyAndRestore();
        fixture.cleanup();
    });

    it('should load an swf and fire load event', function(done) {

        let spy = sandbox.spy(swfobject, 'embedSWF');

        swf.on('load', function() {
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
