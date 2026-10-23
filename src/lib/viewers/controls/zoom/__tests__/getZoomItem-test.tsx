import React from 'react';
import getZoomItem from '../getZoomItem';
import ZoomControlsV2 from '../ZoomControlsV2';
import ZoomMenuItemsV2 from '../ZoomMenuItemsV2';

describe('getZoomItem', () => {
    const props = { onZoomIn: jest.fn(), onZoomOut: jest.fn(), resinTargetZoomIn: 'galleryZoomIn', scale: 0.5 };

    test('should pair the zoom controls with their menu form if zoom can collapse', () => {
        expect(getZoomItem(props, 3)).toEqual({
            control: <ZoomControlsV2 {...props} />,
            id: 'zoom',
            menu: <ZoomMenuItemsV2 {...props} />,
            priority: 3,
        });
    });

    test('should leave out the menu form if zoom has no priority', () => {
        const item = getZoomItem(props);

        expect(item.menu).toBe(false);
        expect(item.priority).toBeUndefined();
    });
});
