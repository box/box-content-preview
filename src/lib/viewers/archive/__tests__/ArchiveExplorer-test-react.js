import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import ArchiveExplorer from '../ArchiveExplorer';

let data;
let filename;

const renderView = props => render(<ArchiveExplorer {...props} />);

describe('lib/viewers/archive/ArchiveExplorer', () => {
    const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');

    beforeAll(() => {
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 1000 });
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 100 });
    });

    afterAll(() => {
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth);
    });

    beforeEach(() => {
        filename = 'test.zip';
        data = [
            {
                type: 'folder',
                absolute_path: 'test/',
                name: 'test',
                modified_at: '19-Dec-02 16:43',
                size: 0,
                item_collection: ['test/csv-level-1.csv', 'test/pdf-level-1.pdf', 'test/subfolder/'],
            },
            {
                type: 'file',
                absolute_path: 'test/csv-level-1.csv',
                name: 'csv-level-1.csv',
                modified_at: '19-Nov-04 16:11',
                size: 133,
                item_collection: null,
            },
            {
                type: 'folder',
                absolute_path: 'test/subfolder/',
                name: 'subfolder',
                modified_at: '19-Dec-02 16:43',
                size: 0,
                item_collection: ['test/subfolder/test-level-2.jpg'],
            },
            {
                type: 'file',
                absolute_path: 'test/subfolder/test-level-2.jpg',
                name: 'test-level-2.jpg',
                modified_at: '19-Nov-08 15:08',
                size: 57379,
                item_collection: null,
            },
            {
                type: 'file',
                absolute_path: 'level-0.txt',
                name: 'level-0.txt',
                modified_at: '19-Nov-04 16:11',
                size: 1,
                item_collection: null,
            },
            {
                type: 'file',
                absolute_path: 'test/pdf-level-1.pdf',
                name: 'pdf-level-1.pdf',
                modified_at: '19-Nov-04 16:11',
                size: 233,
                item_collection: null,
            },
        ];
    });

    describe('render()', () => {
        test('should render correct components', () => {
            renderView({ filename, itemCollection: data });

            expect(screen.getByTestId('bp-archive-explorer')).toBeInTheDocument();
            expect(screen.getByRole('searchbox')).toBeInTheDocument();
            expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
        });
    });

    describe('Subfolders', () => {
        test('should render nested content on folder item click', async () => {
            renderView({ filename, itemCollection: data });

            await userEvent.click(screen.getByText('test'));

            expect(screen.getByText('subfolder')).toBeInTheDocument();
            expect(screen.getByText('pdf-level-1.pdf')).toBeInTheDocument();

            await userEvent.click(screen.getByText('subfolder'));

            expect(screen.getByText('test-level-2.jpg')).toBeInTheDocument();
        });
    });

    describe('Breadcrumbs', () => {
        test('should render breadcrumbs correctly', async () => {
            renderView({ filename, itemCollection: data });

            await userEvent.click(screen.getByText('test'));

            expect(within(screen.getByLabelText('Breadcrumb')).getByText('test.zip')).toBeInTheDocument();
            expect(within(screen.getByLabelText('Breadcrumb')).getByText('test')).toBeInTheDocument();

            await userEvent.click(within(screen.getByLabelText('Breadcrumb')).getByText('test.zip'));

            expect(within(screen.getByLabelText('Breadcrumb')).getByText('test.zip')).toBeInTheDocument();
            expect(within(screen.queryByLabelText('Breadcrumb')).queryByText('test')).not.toBeInTheDocument();
        });
    });

    describe('Items list', () => {
        test('should render items correctly', () => {
            renderView({ filename, itemCollection: data });

            expect(screen.getByRole('gridcell', { name: 'test' })).toHaveAttribute('aria-colindex', '1');
            expect(
                screen.getAllByRole('gridcell', { name: '{time, date, medium} at {time, time, short}' }).at(0),
            ).toHaveAttribute('aria-colindex', '2');
            expect(screen.getByRole('gridcell', { name: '--' })).toHaveAttribute('aria-colindex', '3');

            expect(screen.getByRole('gridcell', { name: 'level-0.txt' })).toHaveAttribute('aria-colindex', '1');
            expect(
                screen.getAllByRole('gridcell', { name: '{time, date, medium} at {time, time, short}' }).at(0),
            ).toHaveAttribute('aria-colindex', '2');
            expect(screen.getByRole('gridcell', { name: '1 Bytes' })).toHaveAttribute('aria-colindex', '3');
        });
    });

    describe('Search', () => {
        test('should correctly search for query longer than 1 letter', async () => {
            renderView({ filename, itemCollection: data });

            await userEvent.type(screen.getByRole('searchbox'), 'test');

            expect(screen.getByText('Search Results')).toBeInTheDocument();
            expect(screen.getByRole('gridcell', { name: 'test' })).toBeInTheDocument();
            expect(screen.getByRole('gridcell', { name: 'test-level-2.jpg' })).toBeInTheDocument();
            expect(screen.queryByRole('gridcell', { name: 'level-0.txt' })).not.toBeInTheDocument();

            await userEvent.clear(screen.getByRole('searchbox'));

            expect(screen.queryByText('Search Results')).not.toBeInTheDocument();
            expect(screen.getByRole('gridcell', { name: 'test' })).toBeInTheDocument();
            expect(screen.getByRole('gridcell', { name: 'level-0.txt' })).toBeInTheDocument();
            expect(screen.queryByRole('gridcell', { name: 'test-level-2.jpg' })).not.toBeInTheDocument();
        });
    });

    describe('Sorting', () => {
        test('should set the sort direction and type', () => {
            renderView({ filename, itemCollection: data });

            expect(screen.getByTitle('Name').querySelector('svg')).toHaveClass('bdl-icon-sort-chevron');
            expect(screen.queryByTitle('Modified').querySelector('svg')).not.toBeInTheDocument();
            expect(screen.queryByTitle('Size').querySelector('svg')).not.toBeInTheDocument();
        });

        test('should sort itemList by clicking on the Size column header', async () => {
            renderView({ filename, itemCollection: data });

            await userEvent.click(within(screen.getByTitle('test')).getByRole('button'));
            await userEvent.click(screen.getByRole('columnheader', { name: 'Size' }));

            expect(screen.getAllByRole('row').at(2).textContent).toContain('subfolder'); // folders come before files
            expect(screen.getAllByRole('row').at(3).textContent).toContain('csv-level-1.csv');
            expect(screen.getAllByRole('row').at(4).textContent).toContain('pdf-level-1.pdf');

            await userEvent.click(screen.getByRole('columnheader', { name: 'Size' }));

            expect(screen.getAllByRole('row').at(2).textContent).toContain('subfolder');
            expect(screen.getAllByRole('row').at(3).textContent).toContain('pdf-level-1.pdf');
            expect(screen.getAllByRole('row').at(4).textContent).toContain('csv-level-1.csv');
        });

        test('should sort itemList by clicking on the Name column header', async () => {
            renderView({ filename, itemCollection: data });

            await userEvent.click(within(screen.queryByTitle('test')).getByRole('button'));
            await userEvent.click(screen.getByRole('columnheader', { name: 'Name' }));

            expect(screen.getAllByRole('row').at(2).textContent).toContain('subfolder'); // folders come before files
            expect(screen.getAllByRole('row').at(3).textContent).toContain('pdf-level-1.pdf');
            expect(screen.getAllByRole('row').at(4).textContent).toContain('csv-level-1.csv');

            await userEvent.click(screen.getByRole('columnheader', { name: 'Name' }));

            expect(screen.getAllByRole('row').at(2).textContent).toContain('subfolder');
            expect(screen.getAllByRole('row').at(3).textContent).toContain('csv-level-1.csv');
            expect(screen.getAllByRole('row').at(4).textContent).toContain('pdf-level-1.pdf');
        });
    });
});
