import { recordProgrammaticResin, setPreviewResin } from '../resin';

describe('lib/resin', () => {
    afterEach(() => {
        setPreviewResin(null);
    });

    test('should no-op when resin is not set', () => {
        expect(() => recordProgrammaticResin('timeScrubber')).not.toThrow();
    });

    test('should no-op without a target', () => {
        const recordAction = jest.fn();
        setPreviewResin({ recordAction });

        recordProgrammaticResin();

        expect(recordAction).not.toHaveBeenCalled();
    });

    test('should record a programmatic toolbar action', () => {
        const recordAction = jest.fn();
        setPreviewResin({ recordAction });

        recordProgrammaticResin('timeScrubber');

        expect(recordAction).toHaveBeenCalledWith({
            action: 'programmatic',
            component: 'toolbar',
            target: 'timeScrubber',
        });
    });
});
