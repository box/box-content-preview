import React from 'react';
import { shallow } from 'enzyme';
import ControlsBar from '../../controls/controls-bar';
import FullscreenToggle from '../../controls/fullscreen';
import MultiImageControls from '../MultiImageControls';
import PageControls from '../../controls/page';
import ZoomControls from '../../controls/zoom';

describe('MultiImageControls', () => {
    describe('render', () => {
        test('should return a valid wrapper', () => {
            const pageCount = 3;
            const pageNumber = 1;
            const onPageChange = jest.fn();
            const onPageSubmit = jest.fn();
            const onToggle = jest.fn();
            const onZoomIn = jest.fn();
            const onZoomOut = jest.fn();
            const wrapper = shallow(
                <MultiImageControls
                    onFullscreenToggle={onToggle}
                    onPageChange={onPageChange}
                    onPageSubmit={onPageSubmit}
                    onZoomIn={onZoomIn}
                    onZoomOut={onZoomOut}
                    pageCount={pageCount}
                    pageNumber={pageNumber}
                />,
            );

            expect(wrapper.exists(ControlsBar));
            expect(wrapper.find(FullscreenToggle).prop('onFullscreenToggle')).toEqual(onToggle);
            expect(wrapper.find(PageControls).prop('onPageChange')).toEqual(onPageChange);
            expect(wrapper.find(PageControls).prop('onPageSubmit')).toEqual(onPageSubmit);
            expect(wrapper.find(PageControls).prop('pageCount')).toEqual(pageCount);
            expect(wrapper.find(PageControls).prop('pageNumber')).toEqual(pageNumber);
            expect(wrapper.find(ZoomControls).prop('onZoomIn')).toEqual(onZoomIn);
            expect(wrapper.find(ZoomControls).prop('onZoomOut')).toEqual(onZoomOut);
        });
    });
});
