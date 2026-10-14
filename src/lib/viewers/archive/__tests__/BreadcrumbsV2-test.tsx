import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import BlueprintProviders from '../../../BlueprintProviders';
import BreadcrumbsV2 from '../BreadcrumbsV2';
import { VIEWS } from '../constants';

(global as unknown as { ResizeObserver: jest.Mock }).ResizeObserver = jest.fn().mockImplementation(() => ({
    disconnect: jest.fn(),
    observe: jest.fn(),
    unobserve: jest.fn(),
}));

describe('lib/viewers/archive/BreadcrumbsV2', () => {
    const recordAction = jest.fn();

    beforeEach(() => {
        window.Box = { Preview: { resin: { recordAction } } };
    });

    afterEach(() => {
        recordAction.mockClear();
        delete window.Box;
    });

    const getWrapper = (props = {}) =>
        render(
            <BlueprintProviders>
                <BreadcrumbsV2
                    filename="test.zip"
                    fullPath="test/subfolder/"
                    onClick={jest.fn()}
                    view={VIEWS.VIEW_FOLDER}
                    {...props}
                />
            </BlueprintProviders>,
        );

    test('should show the archive name and each folder, with the current folder as plain text', () => {
        getWrapper();

        expect(screen.getByRole('button', { name: 'test.zip' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'test' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'subfolder' })).not.toBeInTheDocument();
        expect(screen.getByText('subfolder')).toHaveAttribute('aria-current', 'page');
    });

    test('should navigate to the clicked crumb path', async () => {
        const onClick = jest.fn();
        getWrapper({ onClick });

        await userEvent.setup().click(screen.getByRole('button', { name: 'test' }));

        expect(onClick).toHaveBeenCalledWith('test/');
    });

    test('should navigate to the root from the archive name', async () => {
        const onClick = jest.fn();
        getWrapper({ onClick });

        await userEvent.setup().click(screen.getByRole('button', { name: 'test.zip' }));

        expect(onClick).toHaveBeenCalledWith('root/');
    });

    test('should log the click for analytics', async () => {
        getWrapper();

        await userEvent.setup().click(screen.getByRole('button', { name: 'test' }));

        expect(recordAction).toHaveBeenCalledTimes(1);
        expect(recordAction).toHaveBeenCalledWith(expect.objectContaining({ target: 'breadcrumb' }));
    });

    test('should still navigate when no analytics instance is present', async () => {
        delete window.Box;
        const onClick = jest.fn();
        getWrapper({ onClick });

        await userEvent.setup().click(screen.getByRole('button', { name: 'test' }));

        expect(onClick).toHaveBeenCalledWith('test/');
    });

    test('should show only the search results label in search view', () => {
        getWrapper({ view: VIEWS.VIEW_SEARCH });

        expect(screen.getByText('Search Results')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
