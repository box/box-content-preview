/* eslint-disable no-unused-expressions */
import IFrameLoader from '../iframe-loader';
import IFrame from '../iframe';

const sandbox = sinon.sandbox.create();

describe('lib/viewers/iframe/iframe-loader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    it('should have the correct viewer', () => {
        const iframeViewer = IFrameLoader.viewers[0];
        expect(iframeViewer).to.deep.equal({
            NAME: 'IFrame',
            CONSTRUCTOR: IFrame,
            REP: 'ORIGINAL',
            EXT: ['boxnote', 'boxdicom']
        });
    });
});
