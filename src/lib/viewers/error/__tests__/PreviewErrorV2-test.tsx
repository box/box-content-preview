import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { itemIconTable } from '@box/item-icon';
import PreviewErrorV2, { Props } from '../PreviewErrorV2';

jest.mock('@box/item-icon', () => {
    const actual = jest.requireActual('@box/item-icon');
    const mockIcon = (iconType: string) => () => <svg data-icon-type={iconType} data-testid="item-icon" />;

    return {
        ...actual,
        itemIconTable: Object.fromEntries(Object.keys(actual.itemIconTable).map(key => [key, mockIcon(key)])),
    };
});

describe('lib/viewers/error/PreviewErrorV2', () => {
    const renderComponent = (props: Partial<Props> = {}) =>
        render(<PreviewErrorV2 message="Something went wrong" {...props} />);

    test('should render the message', () => {
        renderComponent();

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    test.each([
        ['pdf', 'pdf'],
        ['PDF', 'pdf'],
        ['docx', 'word-document'],
        ['zip', 'zip'],
        ['unknown', 'default'],
        [undefined, 'default'],
    ])('should render the item icon for extension %s as the %s category', (extension, iconType) => {
        expect(itemIconTable).toHaveProperty(iconType);

        renderComponent({ extension });

        expect(screen.getByTestId('item-icon')).toHaveAttribute('data-icon-type', iconType);
    });

    test('should render a download button that calls onDownload', async () => {
        const user = userEvent.setup();
        const onDownload = jest.fn();
        renderComponent({ onDownload });

        await user.click(screen.getByRole('button', { name: 'Download' }));

        expect(onDownload).toHaveBeenCalledTimes(1);
    });

    test('should render the link as a button styled anchor that opens in a new tab', () => {
        renderComponent({ linkText: 'Open in Box Notes', linkUrl: 'https://example.com/notes' });

        const link = screen.getByRole('link', { name: 'Open in Box Notes' });
        expect(link).toHaveAttribute('href', 'https://example.com/notes');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    test('should prefer the link over the download button when both are provided', () => {
        renderComponent({ linkText: 'Open', linkUrl: 'https://example.com', onDownload: jest.fn() });

        expect(screen.getByRole('link', { name: 'Open' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Download' })).not.toBeInTheDocument();
    });

    test('should render no action when there is no link and no download handler', () => {
        renderComponent();

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    test.each([
        ['linkText only', { linkText: 'Open' }],
        ['linkUrl only', { linkUrl: 'https://example.com' }],
    ])('should fall back to the download button when only %s is provided', (_, props) => {
        renderComponent({ ...props, onDownload: jest.fn() });

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
    });
});
