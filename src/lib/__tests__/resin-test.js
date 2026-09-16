import { recordProgrammaticResin, recordScrubResin, setPreviewResin } from '../resin';

describe('lib/resin', () => {
    afterEach(() => {
        setPreviewResin(null);
    });

    describe('recordProgrammaticResin()', () => {
        test('should no-op when resin is not set', () => {
            expect(() => recordProgrammaticResin({ target: 'timeScrubber' })).not.toThrow();
        });

        test('should no-op without a target', () => {
            const recordAction = jest.fn();
            setPreviewResin({ recordAction });

            recordProgrammaticResin({ component: 'toolbar' });

            expect(recordAction).not.toHaveBeenCalled();
        });

        test('should record a programmatic action with the provided tags', () => {
            const recordAction = jest.fn();
            setPreviewResin({ recordAction });

            recordProgrammaticResin({
                component: 'toolbar',
                fileExtension: 'mp4',
                fileId: '123',
                target: 'timeScrubber',
            });

            expect(recordAction).toHaveBeenCalledWith({
                action: 'programmatic',
                component: 'toolbar',
                fileExtension: 'mp4',
                fileId: '123',
                target: 'timeScrubber',
            });
        });
    });

    describe('recordScrubResin()', () => {
        test('should read toolbar tags from the closest wrapper', () => {
            const recordAction = jest.fn();
            setPreviewResin({ recordAction });

            document.body.innerHTML = `
                <div data-resin-component="toolbar" data-resin-fileid="99" data-resin-fileextension="mp3">
                    <div id="slider" data-resin-target="timeScrubber"></div>
                </div>
            `;

            recordScrubResin(document.getElementById('slider'));

            expect(recordAction).toHaveBeenCalledWith({
                action: 'programmatic',
                component: 'toolbar',
                fileExtension: 'mp3',
                fileId: '99',
                target: 'timeScrubber',
            });
        });

        test('should use fallbackTarget when the element is not tagged', () => {
            const recordAction = jest.fn();
            setPreviewResin({ recordAction });

            document.body.innerHTML = `<div id="slider"></div>`;

            recordScrubResin(document.getElementById('slider'), 'volumeSlider');

            expect(recordAction).toHaveBeenCalledWith({
                action: 'programmatic',
                component: 'toolbar',
                target: 'volumeSlider',
            });
        });
    });
});
