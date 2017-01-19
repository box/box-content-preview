/* eslint-disable no-unused-expressions */
import IFrameLoader from '../iframe-loader';

const sandbox = sinon.sandbox.create();

describe('iframe-loader.js', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    it('should have the correct viewer', () => {
        const iframeViewer = IFrameLoader.viewers[0];
        assert.equal(iframeViewer.REP, 'ORIGINAL');
        assert.equal(iframeViewer.NAME, 'IFrame');
        assert.ok(iframeViewer.JS.indexOf('iframe.js') > -1);
        assert.ok(iframeViewer.EXT.indexOf('boxnote') > -1);
        assert.ok(iframeViewer.EXT.indexOf('boxdicom') > -1);
        assert.ok(iframeViewer.CSS.length === 0);
    });

    it('should not prefetch representations', () => {
        sandbox.stub(IFrameLoader, 'determineViewer');
        sandbox.stub(IFrameLoader, 'determineRepresentation');
        sandbox.stub(IFrameLoader, 'prefetchAssets');

        IFrameLoader.prefetch();

        expect(IFrameLoader.determineViewer).to.not.have.been.called;
        expect(IFrameLoader.determineRepresentation).to.not.have.been.called;
        expect(IFrameLoader.prefetchAssets).to.not.have.been.called;
    });
});
