import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import DashControls, { Props } from '../DashControls';
import HDBadge from '../../controls/media/HDBadge';
import MediaFullscreenToggle from '../../controls/media/MediaFullscreenToggle';
import MediaSettings from '../../controls/media/MediaSettings';
import PlayPauseToggle from '../../controls/media/PlayPauseToggle';
import TimeControls from '../../controls/media/TimeControls';
import VolumeControls from '../../controls/media/VolumeControls';
import { Quality } from '../../controls/media/MediaSettingsMenuQuality';

describe('DashControls', () => {
    describe('render', () => {
        function CustomBadge(): JSX.Element {
            return <div className="custom-badge">custom</div>;
        }

        const getDefaults = (): Props => ({
            audioTrack: 1,
            audioTracks: [],
            autoplay: false,
            isPlaying: false,
            isPlayingHD: false,
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
        });
        const getWrapper = (props = {}): ShallowWrapper => shallow(<DashControls {...getDefaults()} {...props} />);

        test('should return a valid wrapper', () => {
            const onAudioTrackChange = jest.fn();
            const onAutoplayChange = jest.fn();
            const onFullscreenToggle = jest.fn();
            const onMuteChange = jest.fn();
            const onQualityChange = jest.fn();
            const onRateChange = jest.fn();
            const onPlayPause = jest.fn();
            const onTimeChange = jest.fn();
            const onVolumeChange = jest.fn();
            const wrapper = getWrapper({
                onAudioTrackChange,
                onAutoplayChange,
                onFullscreenToggle,
                onMuteChange,
                onPlayPause,
                onQualityChange,
                onRateChange,
                onTimeChange,
                onVolumeChange,
            });

            expect(wrapper.hasClass('bp-DashControls')).toBe(true);
            expect(wrapper.find(MediaFullscreenToggle).prop('onFullscreenToggle')).toEqual(onFullscreenToggle);
            expect(wrapper.find(MediaSettings).props()).toMatchObject({
                audioTrack: 1,
                audioTracks: [],
                autoplay: false,
                onAudioTrackChange,
                onAutoplayChange,
                onQualityChange,
                onRateChange,
                quality: 'auto',
                rate: '1.0',
            });
            expect(wrapper.find(PlayPauseToggle).prop('onPlayPause')).toEqual(onPlayPause);
            expect(wrapper.find(TimeControls).prop('onTimeChange')).toEqual(onTimeChange);
            expect(wrapper.find(VolumeControls).prop('onMuteChange')).toEqual(onMuteChange);
            expect(wrapper.find(VolumeControls).prop('onVolumeChange')).toEqual(onVolumeChange);
        });

        test('should not pass along badge if not playing HD', () => {
            const wrapper = getWrapper({ badge: <CustomBadge /> });
            expect(wrapper.find(MediaSettings).prop('badge')).toBeUndefined();
        });

        test('should pass along badge if playing HD', () => {
            const wrapper = getWrapper({ isPlayingHD: true });
            expect(wrapper.find(MediaSettings).prop('badge')).toEqual(<HDBadge />);
        });
    });
});
