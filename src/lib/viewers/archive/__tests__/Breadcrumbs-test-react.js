import React from 'react';
import { render, screen } from '@testing-library/react';
import Breadcrumbs from '../Breadcrumbs';
import { VIEWS } from '../constants';

describe('lib/viewers/archive/Breadcrumbs', () => {
    const renderView = props => render(<Breadcrumbs {...props} />);

    let filename;
    let fullPath;
    let onClick;
    let view;

    beforeEach(() => {
        filename = 'test.zip';
        fullPath = 'test/subfolder/';
        onClick = jest.fn();
        view = VIEWS.VIEW_FOLDER;
    });

    describe('render()', () => {
        test('should render correct components', () => {
            renderView({ filename, fullPath, onClick, view });

            expect(screen.queryByLabelText('Breadcrumb')).toBeInTheDocument(1);
            expect(screen.queryAllByRole('button')).toHaveLength(3);
            expect(screen.queryAllByRole('button').at(0).textContent).toContain('test.zip');
            expect(screen.queryAllByRole('button').at(1).textContent).toContain('test');
            expect(screen.queryAllByRole('button').at(2).textContent).toContain('subfolder');
        });

        test('should render search result if view is search', () => {
            renderView({ filename, fullPath, onClick, view: VIEWS.VIEW_SEARCH });

            expect(screen.queryByText('Search Results')).toBeInTheDocument();
        });
    });
});
