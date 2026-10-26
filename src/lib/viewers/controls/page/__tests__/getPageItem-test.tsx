import React from 'react';
import getPageItem from '../getPageItem';
import PageControlsV2 from '../PageControlsV2';

describe('getPageItem', () => {
    const props = { onPageChange: jest.fn(), onPageSubmit: jest.fn(), pageCount: 3, pageNumber: 2 };

    test('should keep the page controls on the bar without a menu form', () => {
        expect(getPageItem(props)).toEqual({
            control: <PageControlsV2 {...props} />,
            id: 'page',
        });
    });

    test('should leave out the page controls for a single page', () => {
        expect(getPageItem({ ...props, pageCount: 1 })).toBe(false);
    });
});
