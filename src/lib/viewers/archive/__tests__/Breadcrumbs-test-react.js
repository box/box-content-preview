import React from 'react';
import { render, screen } from '@testing-library/react';
import Breadcrumbs from '../Breadcrumbs';
import { VIEWS } from '../constants';

describe('lib/viewers/archive/Breadcrumbs', () => {
    describe('render()', () => {
        test('should render correct components', () => {
            render(
                <Breadcrumbs
                    filename="test.zip"
                    fullPath="test/subfolder/"
                    onClick={jest.fn()}
                    view={VIEWS.VIEW_FOLDER}
                />,
            );

            expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
            expect(screen.getAllByRole('button')).toHaveLength(3);
            expect(screen.getAllByRole('button').at(0).textContent).toContain('test.zip');
            expect(screen.getAllByRole('button').at(1).textContent).toContain('test');
            expect(screen.getAllByRole('button').at(2).textContent).toContain('subfolder');
        });

        test('should render search result if view is search', () => {
            render(
                <Breadcrumbs
                    filename="test.zip"
                    fullPath="test/subfolder/"
                    onClick={jest.fn()}
                    view={VIEWS.VIEW_SEARCH}
                />,
            );

            expect(screen.getByText('Search Results')).toBeInTheDocument();
        });
    });
});
