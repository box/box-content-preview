import IFrameLoader from '../iframe-loader';

describe('iframe-loader.js', () => {
    it('should have the correct viewer', () => {
        const iframeViewer = IFrameLoader.viewers[0];
        assert.equal(iframeViewer.REPRESENTATION, 'original');
        assert.equal(iframeViewer.CONSTRUCTOR, 'IFrame');
        assert.ok(iframeViewer.SCRIPTS.indexOf('iframe.js') > -1);
        assert.ok(iframeViewer.EXTENSIONS.indexOf('boxnote') > -1);
        assert.ok(iframeViewer.EXTENSIONS.indexOf('boxdicom') > -1);
        assert.ok(iframeViewer.STYLESHEETS.length === 0);
    });
});
