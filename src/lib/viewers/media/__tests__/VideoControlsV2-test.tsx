import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import VideoControlsV2 from '../VideoControlsV2';
import subtitles from '../../controls/media/__mocks__/subtitles';
import { Quality } from '../../controls/media/MediaSettingsMenuQuality';
import { SUBTITLES_OFF } from '../../../constants';

((global as unknown) as { ResizeObserver: jest.Mock }).ResizeObserver = jest.fn().mockImplementation(() => ({
    disconnect: jest.fn(),
    observe: jest.fn(),
    unobserve: jest.fn(),
}));

const defaultProps = {
    audioTrack: 1,
    audioTracks: [],
    autoplay: false,
    isPlaying: false,
    movePlayback: jest.fn(),
    onAnnotationColorChange: jest.fn(),
    onAnnotationModeClick: jest.fn(),
    onAnnotationModeEscape: jest.fn(),
    onAudioTrackChange: jest.fn(),
    onAutoplayChange: jest.fn(),
    onFullscreenToggle: jest.fn(),
    onMuteChange: jest.fn(),
    onPlayPause: jest.fn(),
    onQualityChange: jest.fn(),
    onRateChange: jest.fn(),
    onTimeChange: jest.fn(),
    onVolumeChange: jest.fn(),
    quality: Quality.AUTO,
    rate: '1.0',
};

describe('VideoControlsV2', () => {
    describe('render', () => {
        test('should render the V2 controls wrapper', () => {
            render(<VideoControlsV2 {...defaultProps} />);
            expect(screen.getByTestId('media-controls-wrapper-v2')).toBeInTheDocument();
        });

        test('should render play button and respond to clicks', async () => {
            const user = userEvent.setup();
            const onPlayPause = jest.fn();
            render(<VideoControlsV2 {...defaultProps} onPlayPause={onPlayPause} />);

            await user.click(screen.getByTitle('Play'));
            expect(onPlayPause).toHaveBeenCalledWith(true);
        });

        test('should render pause button when playing', () => {
            render(<VideoControlsV2 {...defaultProps} isPlaying />);
            expect(screen.getByTitle('Pause')).toBeInTheDocument();
            expect(screen.queryByTitle('Play')).not.toBeInTheDocument();
        });

        test('should render skip forward/backward buttons and respond to clicks', async () => {
            const user = userEvent.setup();
            const movePlayback = jest.fn();
            render(<VideoControlsV2 {...defaultProps} movePlayback={movePlayback} />);

            expect(screen.getByTitle('Skip forward')).toBeInTheDocument();
            expect(screen.getByTitle('Skip backward')).toBeInTheDocument();

            await user.click(screen.getByTitle('Skip forward'));
            expect(movePlayback).toHaveBeenCalledWith(true, 5);

            await user.click(screen.getByTitle('Skip backward'));
            expect(movePlayback).toHaveBeenCalledWith(false, 5);
        });

        test('should not render skip buttons when isNarrowVideo is true', () => {
            render(<VideoControlsV2 {...defaultProps} isNarrowVideo />);
            expect(screen.queryByTitle('Skip forward')).not.toBeInTheDocument();
            expect(screen.queryByTitle('Skip backward')).not.toBeInTheDocument();
        });

        test('should render fullscreen button', () => {
            render(<VideoControlsV2 {...defaultProps} />);
            expect(screen.getByRole('button', { name: /fullscreen/i })).toBeInTheDocument();
        });
    });

    describe('timestamp', () => {
        test('should show current / total time when not narrow', () => {
            render(<VideoControlsV2 {...defaultProps} currentTime={65} durationTime={120} />);
            const timestamp = screen.getByTestId('bp-TimestampControl-button');
            expect(timestamp).toHaveTextContent('1:05/2:00');
        });

        test('should show only current time when narrow', () => {
            render(<VideoControlsV2 {...defaultProps} currentTime={65} durationTime={120} isNarrowVideo />);
            const timestamp = screen.getByTestId('bp-TimestampControl-button');
            expect(timestamp).toHaveTextContent('1:05');
            expect(timestamp).not.toHaveTextContent('/');
        });

        test('should open the time format dropdown when timestamp is clicked', async () => {
            const user = userEvent.setup();
            render(<VideoControlsV2 {...defaultProps} currentTime={65} durationTime={120} />);

            await user.click(screen.getByTestId('bp-TimestampControl-button'));
            expect(screen.getByTestId('bp-TimestampControl-flyout')).toBeInTheDocument();
        });
    });

    describe('volume controls', () => {
        test('should render volume and respond to mute click', async () => {
            const user = userEvent.setup();
            const onMuteChange = jest.fn();
            render(<VideoControlsV2 {...defaultProps} onMuteChange={onMuteChange} />);

            await user.click(screen.getByTitle('Mute'));
            expect(onMuteChange).toHaveBeenCalledTimes(1);
        });
    });

    describe('subtitles toggle', () => {
        test('should render SubtitlesToggle when subtitles exist', () => {
            render(<VideoControlsV2 {...defaultProps} subtitle={SUBTITLES_OFF} subtitles={subtitles} />);
            expect(screen.getByTitle('Subtitles/Closed Captions')).toBeInTheDocument();
        });
    });

    describe('settings', () => {
        test('should render settings button', () => {
            render(<VideoControlsV2 {...defaultProps} />);
            expect(screen.getByTitle('Settings')).toBeInTheDocument();
        });
    });

    describe('annotations', () => {
        test('should not render annotations controls when disabled', () => {
            render(<VideoControlsV2 {...defaultProps} videoAnnotationsEnabled={false} />);
            expect(screen.queryByTestId('bp-annotations-controls')).not.toBeInTheDocument();
        });

        test('should render annotations controls when enabled', () => {
            render(<VideoControlsV2 {...defaultProps} hasDrawing hasRegion videoAnnotationsEnabled />);
            expect(screen.getByTestId('bp-annotations-controls')).toBeInTheDocument();
        });
    });
});
