import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import DashControls from '../DashControls';
import subtitles from '../../controls/media/__mocks__/subtitles';
import { Quality } from '../../controls/media/MediaSettingsMenuQuality';
import { SUBTITLES_OFF } from '../../../constants';

describe('DashControls', () => {
    describe('render', () => {
        test('should return a valid wrapper', async () => {
            const user = userEvent.setup();
            const onAudioTrackChange = jest.fn();
            const onAutoplayChange = jest.fn();
            const onFullscreenToggle = jest.fn();
            const onMuteChange = jest.fn();
            const onQualityChange = jest.fn();
            const onRateChange = jest.fn();
            const onPlayPause = jest.fn();
            const onTimeChange = jest.fn();
            const onVolumeChange = jest.fn();
            const movePlayback = jest.fn();
            render(
                <DashControls
                    audioTrack={1}
                    audioTracks={[]}
                    autoplay={false}
                    isPlaying={false}
                    isPlayingHD={false}
                    movePlayback={movePlayback}
                    onAudioTrackChange={onAudioTrackChange}
                    onAutoplayChange={onAutoplayChange}
                    onFullscreenToggle={onFullscreenToggle}
                    onMuteChange={onMuteChange}
                    onPlayPause={onPlayPause}
                    onQualityChange={onQualityChange}
                    onRateChange={onRateChange}
                    onTimeChange={onTimeChange}
                    onVolumeChange={onVolumeChange}
                    quality={Quality.AUTO}
                    rate="1.0"
                />,
            );

            await user.click(screen.getByTitle('Enter fullscreen'));
            expect(onFullscreenToggle).toHaveBeenCalledTimes(1);

            await user.click(screen.getByTitle('Play'));
            expect(onPlayPause).toHaveBeenCalledTimes(1);

            fireEvent.mouseDown(screen.getByLabelText('Media Slider'));
            expect(onTimeChange).toHaveBeenCalledTimes(1);

            await user.click(screen.getByTitle('Mute'));
            expect(onMuteChange).toHaveBeenCalledTimes(1);

            fireEvent.mouseDown(screen.getByLabelText('Volume Slider'));
            expect(onVolumeChange).toHaveBeenCalledTimes(1);
        });

        test.each([true, false])(
            'should not see annotations controls if feature is disabled',
            async isVideoAnnotationsEnabled => {
                render(
                    <DashControls
                        audioTrack={1}
                        audioTracks={[]}
                        autoplay={false}
                        isHDSupported
                        isPlaying={false}
                        isPlayingHD={false}
                        movePlayback={jest.fn()}
                        onAudioTrackChange={jest.fn()}
                        onAutoplayChange={jest.fn()}
                        onFullscreenToggle={jest.fn()}
                        onMuteChange={jest.fn()}
                        onPlayPause={jest.fn()}
                        onQualityChange={jest.fn()}
                        onRateChange={jest.fn()}
                        onTimeChange={jest.fn()}
                        onVolumeChange={jest.fn()}
                        quality={Quality.AUTO}
                        rate="1.0"
                        videoAnnotationsEnabled={isVideoAnnotationsEnabled}
                    />,
                );

                if (isVideoAnnotationsEnabled) {
                    expect(screen.getByTestId('bp-annotations-controls')).toBeInTheDocument();
                } else {
                    expect(screen.queryByTestId('bp-annotations-controls')).not.toBeInTheDocument();
                }
            },
        );
        test.each([true, false])('should set isHDSupported prop on MediaSettings as %s', async isHDSupported => {
            const user = userEvent.setup();
            render(
                <DashControls
                    audioTrack={1}
                    audioTracks={[]}
                    autoplay={false}
                    isHDSupported={isHDSupported}
                    isPlaying={false}
                    isPlayingHD={false}
                    movePlayback={jest.fn()}
                    onAudioTrackChange={jest.fn()}
                    onAutoplayChange={jest.fn()}
                    onFullscreenToggle={jest.fn()}
                    onMuteChange={jest.fn()}
                    onPlayPause={jest.fn()}
                    onQualityChange={jest.fn()}
                    onRateChange={jest.fn()}
                    onTimeChange={jest.fn()}
                    onVolumeChange={jest.fn()}
                    quality={Quality.AUTO}
                    rate="1.0"
                />,
            );

            await user.click(screen.getByTitle('Settings'));

            expect(screen.getByTestId('bp-media-settings-quality')).toHaveAttribute(
                'aria-disabled',
                `${!isHDSupported}`,
            );
        });

        test('should not pass along badge if not playing HD', () => {
            render(
                <DashControls
                    audioTrack={1}
                    audioTracks={[]}
                    autoplay={false}
                    badge={<div className="custom-badge">custom</div>}
                    isPlaying={false}
                    isPlayingHD={false}
                    movePlayback={jest.fn()}
                    onAudioTrackChange={jest.fn()}
                    onAutoplayChange={jest.fn()}
                    onFullscreenToggle={jest.fn()}
                    onMuteChange={jest.fn()}
                    onPlayPause={jest.fn()}
                    onQualityChange={jest.fn()}
                    onRateChange={jest.fn()}
                    onTimeChange={jest.fn()}
                    onVolumeChange={jest.fn()}
                    quality={Quality.AUTO}
                    rate="1.0"
                />,
            );

            expect(screen.queryByTestId('bp-media-controls-hd')).not.toBeInTheDocument();
        });

        test('should pass along badge if playing HD', () => {
            render(
                <DashControls
                    audioTrack={1}
                    audioTracks={[]}
                    autoplay={false}
                    isPlaying={false}
                    isPlayingHD
                    movePlayback={jest.fn()}
                    onAudioTrackChange={jest.fn()}
                    onAutoplayChange={jest.fn()}
                    onFullscreenToggle={jest.fn()}
                    onMuteChange={jest.fn()}
                    onPlayPause={jest.fn()}
                    onQualityChange={jest.fn()}
                    onRateChange={jest.fn()}
                    onTimeChange={jest.fn()}
                    onVolumeChange={jest.fn()}
                    quality={Quality.AUTO}
                    rate="1.0"
                />,
            );

            expect(screen.getByTestId('bp-media-controls-hd')).toBeInTheDocument();
        });

        test('should render SubtitlesToggle if subtitles exist', async () => {
            const user = userEvent.setup();
            const onSubtitlesToggle = jest.fn();
            render(
                <DashControls
                    audioTrack={1}
                    audioTracks={[]}
                    autoplay={false}
                    isAutoGeneratedSubtitles
                    isPlaying={false}
                    isPlayingHD={false}
                    movePlayback={jest.fn()}
                    onAudioTrackChange={jest.fn()}
                    onAutoplayChange={jest.fn()}
                    onFullscreenToggle={jest.fn()}
                    onMuteChange={jest.fn()}
                    onPlayPause={jest.fn()}
                    onQualityChange={jest.fn()}
                    onRateChange={jest.fn()}
                    onSubtitlesToggle={onSubtitlesToggle}
                    onTimeChange={jest.fn()}
                    onVolumeChange={jest.fn()}
                    quality={Quality.AUTO}
                    rate="1.0"
                    subtitles={subtitles}
                />,
            );

            expect(screen.queryByTitle('Subtitles/Closed Captions')).not.toBeInTheDocument();
            expect(screen.getByTitle('Auto-Generated Captions')).toBeInTheDocument();
            expect(screen.getByTitle('Auto-Generated Captions')).toHaveAttribute('aria-pressed', 'true');

            await user.click(screen.getByTitle('Auto-Generated Captions'));

            expect(onSubtitlesToggle).toHaveBeenCalledTimes(1);
        });

        test('should render with isShowingSubtitles as false if subtitle is SUBTITLES_OFF', () => {
            render(
                <DashControls
                    audioTrack={1}
                    audioTracks={[]}
                    autoplay={false}
                    isPlaying={false}
                    isPlayingHD={false}
                    movePlayback={jest.fn()}
                    onAudioTrackChange={jest.fn()}
                    onAutoplayChange={jest.fn()}
                    onFullscreenToggle={jest.fn()}
                    onMuteChange={jest.fn()}
                    onPlayPause={jest.fn()}
                    onQualityChange={jest.fn()}
                    onRateChange={jest.fn()}
                    onTimeChange={jest.fn()}
                    onVolumeChange={jest.fn()}
                    quality={Quality.AUTO}
                    rate="1.0"
                    subtitle={SUBTITLES_OFF}
                    subtitles={subtitles}
                />,
            );

            expect(screen.queryByTitle('Auto-Generated Captions')).not.toBeInTheDocument();
            expect(screen.getByTitle('Subtitles/Closed Captions')).toBeInTheDocument();
            expect(screen.getByTitle('Subtitles/Closed Captions')).toHaveAttribute('aria-pressed', 'false');
        });
    });
});
