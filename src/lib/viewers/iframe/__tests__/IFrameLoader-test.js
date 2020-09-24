/* eslint-disable no-unused-expressions */
import IFrameLoader from '../IFrameLoader';
import IFrameViewer from '../IFrameViewer';

const sandbox = sinon.createSandbox();

describe('lib/viewers/iframe/IFrameLoader', () => {
    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    test('should have the correct viewer', () => {
        const iframeViewer = IFrameLoader.viewers[0];
        expect(iframeViewer).toEqual({
            NAME: 'IFrame',
            CONSTRUCTOR: IFrameViewer,
            REP: 'ORIGINAL',
            EXT: ['boxnote', 'boxdicom'],
        });
    });
});
