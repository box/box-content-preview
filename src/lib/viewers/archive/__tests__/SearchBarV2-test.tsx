import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import BlueprintProviders from '../../../BlueprintProviders';
import SearchBarV2 from '../SearchBarV2';

describe('lib/viewers/archive/SearchBarV2', () => {
    const getWrapper = (props = {}) =>
        render(
            <BlueprintProviders>
                <SearchBarV2 onSearch={jest.fn()} searchQuery="" {...props} />
            </BlueprintProviders>,
        );

    test('should show the current query in a searchbox', () => {
        getWrapper({ searchQuery: 'test' });

        expect(screen.getByRole('searchbox')).toHaveValue('test');
    });

    test('should keep the resin and test hooks of the v1 search box', () => {
        getWrapper();

        expect(screen.getByRole('searchbox')).toHaveAttribute('data-resin-target', 'searchInput');
        expect(screen.getByTestId('search-input')).toBe(screen.getByRole('searchbox'));
    });

    test('should report typed text', async () => {
        const onSearch = jest.fn();
        getWrapper({ onSearch });

        await userEvent.setup().type(screen.getByRole('searchbox'), 'a');

        expect(onSearch).toHaveBeenLastCalledWith('a');
    });

    test('should clear the query on Escape', async () => {
        const onSearch = jest.fn();
        getWrapper({ onSearch, searchQuery: 'abc' });

        await userEvent.setup().type(screen.getByRole('searchbox'), '{Escape}');

        expect(onSearch).toHaveBeenLastCalledWith('');
    });

    test('should clear the query from the clear button', async () => {
        const onSearch = jest.fn();
        getWrapper({ onSearch, searchQuery: 'abc' });

        await userEvent.setup().click(screen.getByRole('button'));

        expect(onSearch).toHaveBeenLastCalledWith('');
    });
});
