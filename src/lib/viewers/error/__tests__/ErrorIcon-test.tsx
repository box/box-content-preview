import React from 'react';
import { render, screen } from '@testing-library/react';
import { getIcon } from 'box-ui-elements/es/components/preview';
import ErrorIcon from '../ErrorIcon';

jest.mock('@box/item-icon', () => ({
    ...jest.requireActual('@box/item-icon'),
    ItemIcon: ({ ariaHidden, iconType }: { ariaHidden?: boolean; iconType: string }) => (
        <span aria-hidden={ariaHidden} data-icon-type={iconType} data-testid="item-icon" />
    ),
}));

jest.mock('box-ui-elements/es/components/preview', () => ({
    getIcon: jest.fn(() => ({ extension }: { extension?: string }) => (
        <span data-extension={extension} data-testid="legacy-icon" />
    )),
}));

describe('lib/viewers/error/ErrorIcon', () => {
    test.each(['pdf', 'zip', 'unknown'])(
        'should render the box-ui-elements icon for %s when isBlueprintEnabled is false',
        extension => {
            render(<ErrorIcon extension={extension} isBlueprintEnabled={false} />);

            expect(getIcon).toHaveBeenCalledWith(extension);
            expect(screen.getByTestId('legacy-icon')).toHaveAttribute('data-extension', extension);
            expect(screen.queryByTestId('item-icon')).not.toBeInTheDocument();
        },
    );

    test('should render the box-ui-elements icon when the isBlueprintEnabled prop is omitted', () => {
        render(<ErrorIcon extension="pdf" />);

        expect(screen.getByTestId('legacy-icon')).toBeInTheDocument();
        expect(screen.queryByTestId('item-icon')).not.toBeInTheDocument();
    });

    test.each([
        ['pdf', 'pdf'],
        ['PDF', 'pdf'],
        ['docx', 'word-document'],
        ['zip', 'zip'],
        ['unknown', 'default'],
        [undefined, 'default'],
    ])(
        'should render the item icon for extension %s as the %s category when isBlueprintEnabled is true',
        (extension, iconType) => {
            render(<ErrorIcon extension={extension} isBlueprintEnabled />);

            expect(screen.getByTestId('item-icon')).toHaveAttribute('data-icon-type', iconType);
            expect(screen.queryByTestId('legacy-icon')).not.toBeInTheDocument();
            expect(getIcon).not.toHaveBeenCalled();
        },
    );

    test('should hide the item icon from assistive technology', () => {
        render(<ErrorIcon extension="pdf" isBlueprintEnabled />);

        expect(screen.getByTestId('item-icon')).toHaveAttribute('aria-hidden', 'true');
    });
});
