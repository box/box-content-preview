import React from 'react';
import { render, screen } from '@testing-library/react';
import SearchBar from '../SearchBar';

describe('lib/viewers/archive/SearchBar', () => {
    describe('render()', () => {
        test('should render correct components', async () => {
            render(<SearchBar onSearch={jest.fn()} searchQuery="test" />);

            const searchbox = await screen.findByRole('searchbox');
            expect(searchbox).toBeInTheDocument();
        });
    });
});
