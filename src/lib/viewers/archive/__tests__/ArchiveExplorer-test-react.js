import React from 'react';
import { act } from 'react-dom/test-utils';
import { fireEvent, render, within } from '@testing-library/react';
import ArchiveExplorer from '../ArchiveExplorer';

let data;
let filename;

const getComponent = props => render(<ArchiveExplorer {...props} />);

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
            const component = getComponent({ filename, itemCollection: data });

            expect(component.queryByTestId('bp-ArchiveExplorer')).toBeInTheDocument();
            expect(component.queryByRole('searchbox')).toBeInTheDocument();
            expect(component.queryByLabelText('Breadcrumb')).toBeInTheDocument();
        });
    });

    describe('Subfolders', () => {
        test('should render nested content on folder item click', () => {
            const component = getComponent({ filename, itemCollection: data });

            act(() => {
                component.queryByText('test').click();
            });

            expect(component.queryByText('subfolder')).toBeInTheDocument();
            expect(component.queryByText('pdf-level-1.pdf')).toBeInTheDocument();

            act(() => {
                component.queryByText('subfolder').click();
            });

            expect(component.queryByText('test-level-2.jpg')).toBeInTheDocument();
        });
    });

    describe('Breadcrumbs', () => {
        test('should render breadcrumbs correctly', () => {
            const component = getComponent({ filename, itemCollection: data });

            act(() => {
                component.queryByText('test').click();
            });

            expect(within(component.queryByLabelText('Breadcrumb')).queryByText('test.zip')).toBeInTheDocument();
            expect(within(component.queryByLabelText('Breadcrumb')).queryByText('test')).toBeInTheDocument();

            act(() => {
                within(component.queryByLabelText('Breadcrumb'))
                    .queryByText('test.zip')
                    .click();
            });

            expect(within(component.queryByLabelText('Breadcrumb')).queryByText('test.zip')).toBeInTheDocument();
            expect(within(component.queryByLabelText('Breadcrumb')).queryByText('test')).not.toBeInTheDocument();
        });
    });

    describe('Items list', () => {
        test('should render items correctly', () => {
            const component = getComponent({ filename, itemCollection: data });

            expect(component.getByRole('gridcell', { name: 'test' })).toHaveAttribute('aria-colindex', '1');
            expect(
                component.getAllByRole('gridcell', { name: '{time, date, medium} at {time, time, short}' }).at(0),
            ).toHaveAttribute('aria-colindex', '2');
            expect(component.getByRole('gridcell', { name: '--' })).toHaveAttribute('aria-colindex', '3');

            expect(component.getByRole('gridcell', { name: 'level-0.txt' })).toHaveAttribute('aria-colindex', '1');
            expect(
                component.getAllByRole('gridcell', { name: '{time, date, medium} at {time, time, short}' }).at(0),
            ).toHaveAttribute('aria-colindex', '2');
            expect(component.getByRole('gridcell', { name: '1 Bytes' })).toHaveAttribute('aria-colindex', '3');
        });
    });

    describe('Search', () => {
        test('should correctly search for query longer than 1 letter', () => {
            const component = getComponent({ filename, itemCollection: data });

            act(() => {
                fireEvent.change(component.queryByRole('searchbox'), { target: { value: 'test' } });
            });

            expect(component.queryByText('Search Results')).toBeInTheDocument();
            expect(component.queryByRole('gridcell', { name: 'test' })).toBeInTheDocument();
            expect(component.queryByRole('gridcell', { name: 'test-level-2.jpg' })).toBeInTheDocument();
            expect(component.queryByRole('gridcell', { name: 'level-0.txt' })).not.toBeInTheDocument();

            act(() => {
                fireEvent.change(component.queryByRole('searchbox'), { target: { value: '' } });
            });

            expect(component.queryByText('Search Results')).not.toBeInTheDocument();
            expect(component.queryByRole('gridcell', { name: 'test' })).toBeInTheDocument();
            expect(component.queryByRole('gridcell', { name: 'level-0.txt' })).toBeInTheDocument();
            expect(component.queryByRole('gridcell', { name: 'test-level-2.jpg' })).not.toBeInTheDocument();
        });
    });

    describe('Sorting', () => {
        test('should set the sort direction and type', () => {
            const component = getComponent({ filename, itemCollection: data });

            expect(component.queryByTitle('Name').querySelector('svg')).toHaveClass('bdl-icon-sort-chevron');
            expect(component.queryByTitle('Modified').querySelector('svg')).not.toBeInTheDocument();
            expect(component.queryByTitle('Size').querySelector('svg')).not.toBeInTheDocument();
        });

        test('should sort itemList by clicking on the Size column header', () => {
            const component = getComponent({ filename, itemCollection: data });

            act(() => {
                within(component.queryByTitle('test'))
                    .queryByRole('button')
                    .click();
            });
            act(() => {
                component.queryByTitle('Size').click();
            });

            expect(component.queryAllByRole('row').at(2).textContent).toContain('subfolder'); // folders come before files
            expect(component.queryAllByRole('row').at(3).textContent).toContain('csv-level-1.csv');
            expect(component.queryAllByRole('row').at(4).textContent).toContain('pdf-level-1.pdf');

            act(() => {
                component.queryByTitle('Size').click();
            });

            expect(component.queryAllByRole('row').at(2).textContent).toContain('subfolder');
            expect(component.queryAllByRole('row').at(3).textContent).toContain('pdf-level-1.pdf');
            expect(component.queryAllByRole('row').at(4).textContent).toContain('csv-level-1.csv');
        });

        test('should sort itemList by clicking on the Name column header', () => {
            const component = getComponent({ filename, itemCollection: data });

            act(() => {
                within(component.queryByTitle('test'))
                    .queryByRole('button')
                    .click();
            });
            act(() => {
                component.queryByTitle('Name').click();
            });

            expect(component.queryAllByRole('row').at(2).textContent).toContain('subfolder'); // folders come before files
            expect(component.queryAllByRole('row').at(3).textContent).toContain('pdf-level-1.pdf');
            expect(component.queryAllByRole('row').at(4).textContent).toContain('csv-level-1.csv');

            act(() => {
                component.queryByTitle('Name').click();
            });

            expect(component.queryAllByRole('row').at(2).textContent).toContain('subfolder');
            expect(component.queryAllByRole('row').at(3).textContent).toContain('csv-level-1.csv');
            expect(component.queryAllByRole('row').at(4).textContent).toContain('pdf-level-1.pdf');
        });
    });
});
