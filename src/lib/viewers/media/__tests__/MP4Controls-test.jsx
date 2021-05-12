import React from 'react';
import { shallow } from 'enzyme';
import MP4Controls from '../MP4Controls';
import MediaFullscreenToggle from '../../controls/media/MediaFullscreenToggle';
import MediaSettings from '../../controls/media/MediaSettings';
import PlayPauseToggle from '../../controls/media/PlayPauseToggle';
import TimeControls from '../../controls/media/TimeControls';
import VolumeControls from '../../controls/media/VolumeControls';

describe('MP4Controls', () => {
    describe('render', () => {
        test('should return a valid wrapper', () => {
            const onAutoplayChange = jest.fn();
            const onFullscreenToggle = jest.fn();
            const onMuteChange = jest.fn();
            const onRateChange = jest.fn();
            const onPlayPause = jest.fn();
            const onTimeChange = jest.fn();
            const onVolumeChange = jest.fn();
            const wrapper = shallow(
                <MP4Controls
                    autoplay={false}
                    onAutoplayChange={onAutoplayChange}
                    onFullscreenToggle={onFullscreenToggle}
                    onMuteChange={onMuteChange}
                    onPlayPause={onPlayPause}
                    onRateChange={onRateChange}
                    onTimeChange={onTimeChange}
                    onVolumeChange={onVolumeChange}
                    rate="1.0"
                />,
            );

            expect(wrapper.hasClass('bp-MP4Controls')).toBe(true);
            expect(wrapper.find(MediaFullscreenToggle).prop('onFullscreenToggle')).toEqual(onFullscreenToggle);
            expect(wrapper.find(MediaSettings).prop('onAutoplayChange')).toEqual(onAutoplayChange);
            expect(wrapper.find(MediaSettings).prop('onRateChange')).toEqual(onRateChange);
            expect(wrapper.find(PlayPauseToggle).prop('onPlayPause')).toEqual(onPlayPause);
            expect(wrapper.find(TimeControls).prop('onTimeChange')).toEqual(onTimeChange);
            expect(wrapper.find(VolumeControls).prop('onMuteChange')).toEqual(onMuteChange);
            expect(wrapper.find(VolumeControls).prop('onVolumeChange')).toEqual(onVolumeChange);
        });
    });
});
