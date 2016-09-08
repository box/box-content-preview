/* eslint-disable no-unused-expressions */
import IFrameLoader from '../iframe-loader';

const sandbox = sinon.sandbox.create();

describe('iframe-loader.js', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    it('should have the correct viewer', () => {
        const iframeViewer = IFrameLoader.viewers[0];
        assert.equal(iframeViewer.REPRESENTATION, 'original');
        assert.equal(iframeViewer.CONSTRUCTOR, 'IFrame');
        assert.ok(iframeViewer.SCRIPTS.indexOf('iframe.js') > -1);
        assert.ok(iframeViewer.EXTENSIONS.indexOf('boxnote') > -1);
        assert.ok(iframeViewer.EXTENSIONS.indexOf('boxdicom') > -1);
        assert.ok(iframeViewer.STYLESHEETS.length === 0);
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
