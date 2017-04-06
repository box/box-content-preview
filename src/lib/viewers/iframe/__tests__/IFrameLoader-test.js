/* eslint-disable no-unused-expressions */
import IFrameLoader from '../IFrameLoader';
import IFrameViewer from '../IFrameViewer';

const sandbox = sinon.sandbox.create();

describe('lib/viewers/iframe/IFrameLoader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    it('should have the correct viewer', () => {
        const iframeViewer = IFrameLoader.viewers[0];
        expect(iframeViewer).to.deep.equal({
            NAME: 'IFrame',
            CONSTRUCTOR: IFrameViewer,
            REP: 'ORIGINAL',
            EXT: ['boxnote', 'boxdicom']
        });
    });
});
