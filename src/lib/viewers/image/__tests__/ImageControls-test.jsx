import React from 'react';
import { shallow } from 'enzyme';
import ControlsBar from '../../controls/controls-bar';
import FullscreenToggle from '../../controls/fullscreen';
import ImageControls from '../ImageControls';
import RotateControl from '../../controls/rotate';
import ZoomControls from '../../controls/zoom';

describe('ImageControls', () => {
    describe('render', () => {
        test('should return a valid wrapper', () => {
            const onRotateLeft = jest.fn();
            const onToggle = jest.fn();
            const onZoomIn = jest.fn();
            const onZoomOut = jest.fn();
            const wrapper = shallow(
                <ImageControls
                    onFullscreenToggle={onToggle}
                    onRotateLeft={onRotateLeft}
                    onZoomIn={onZoomIn}
                    onZoomOut={onZoomOut}
                />,
            );

            expect(wrapper.exists(ControlsBar));
            expect(wrapper.find(FullscreenToggle).prop('onFullscreenToggle')).toEqual(onToggle);
            expect(wrapper.find(ZoomControls).prop('onZoomIn')).toEqual(onZoomIn);
            expect(wrapper.find(ZoomControls).prop('onZoomOut')).toEqual(onZoomOut);
            expect(wrapper.find(RotateControl).prop('onRotateLeft')).toEqual(onRotateLeft);
        });
    });
});
