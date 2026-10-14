import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ItemIcon } from '@box/item-icon';
import BlueprintProviders from '../../../BlueprintProviders';
import ArchiveTableV2, { ArchiveItem, Props } from '../ArchiveTableV2';

jest.mock('@box/item-icon', () => {
    const actual = jest.requireActual('@box/item-icon');
    return { ...actual, ItemIcon: jest.fn(actual.ItemIcon) };
});

describe('lib/viewers/archive/ArchiveTableV2', () => {
    const originalResizeObserver = global.ResizeObserver;
    const originalScrollTo = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo');
    const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
    const folder: ArchiveItem = { absolute_path: 'folder/', name: 'folder', size: 0, type: 'folder' };
    const file: ArchiveItem = {
        absolute_path: 'file.txt',
        modified_at: '2002-12-19T16:43:00Z',
        name: 'file.txt',
        size: 1024,
        type: 'file',
    };
    const items = [folder, file];

    beforeAll(() => {
        global.ResizeObserver = jest.fn(() => ({
            disconnect: jest.fn(),
            observe: jest.fn(),
            unobserve: jest.fn(),
        }));
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 560 });
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 1000 });
        Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
            configurable: true,
            value(this: HTMLElement, { top }: ScrollToOptions) {
                this.scrollTop = top ?? 0;
            },
        });
    });

    afterAll(() => {
        global.ResizeObserver = originalResizeObserver;
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight!);
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth!);
        if (originalScrollTo) {
            Object.defineProperty(HTMLElement.prototype, 'scrollTo', originalScrollTo);
        } else {
            Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo');
        }
    });

    const getWrapper = (props: Partial<Props> = {}) => (
        <BlueprintProviders>
            <ArchiveTableV2
                items={items}
                onItemClick={jest.fn()}
                onSort={jest.fn()}
                sortBy="name"
                sortDirection="ASC"
                {...props}
            />
        </BlueprintProviders>
    );

    test.each([
        { description: 'folder', item: folder, iconType: 'folder-plain' },
        { description: 'uppercase PDF', item: { ...file, name: 'report.PDF' }, iconType: 'pdf' },
        { description: 'unknown extension', item: { ...file, name: 'file.unknown' }, iconType: 'default' },
        { description: 'extensionless file', item: { ...file, name: 'pdf' }, iconType: 'default' },
    ])('should render a decorative icon for a $description', ({ item, iconType }) => {
        render(getWrapper({ items: [item] }));

        expect(ItemIcon).toHaveBeenCalledWith(
            expect.objectContaining({ ariaHidden: true, iconType }),
            expect.anything(),
        );
        const row = screen.getByRole('row', { name: item.name });
        expect(within(row).getByRole('img', { hidden: true })).toHaveAttribute('aria-hidden', 'true');
        expect(within(row).queryByRole('img')).not.toBeInTheDocument();
    });

    test('should render a window of a large list and retain row positions and resin targets', () => {
        const largeList = Array.from({ length: 5000 }, (_, index) => ({
            absolute_path: `file-${index}.txt`,
            name: `file-${index}.txt`,
            size: index,
            type: 'file',
        }));
        render(getWrapper({ items: largeList }));

        const table = screen.getByRole('grid', { name: 'Name' });
        const dataRows = within(table)
            .getAllByRole('row')
            .filter(row => row.hasAttribute('aria-rowindex'));

        expect(table).toHaveAttribute('aria-rowcount', '5001');
        expect(dataRows.length).toBeGreaterThan(0);
        expect(dataRows.length).toBeLessThan(30);
        expect(dataRows[0]).toHaveAttribute('aria-rowindex', '2');
        expect(dataRows[0]).toHaveAttribute('data-resin-target', 'file');
        expect(screen.queryByText('file-4999.txt')).not.toBeInTheDocument();

        const scrollElement = table.closest<HTMLDivElement>('.bp-ArchiveTableV2')!;
        fireEvent.scroll(scrollElement, { target: { scrollTop: 5600 } });

        const scrolledRows = within(table)
            .getAllByRole('row')
            .filter(row => row.hasAttribute('aria-rowindex'));
        expect(screen.queryByText('file-0.txt')).not.toBeInTheDocument();
        expect(screen.getByText('file-100.txt')).toBeVisible();
        expect(Number(scrolledRows[0].getAttribute('aria-rowindex'))).toBeGreaterThan(2);
        const spacers = within(table)
            .getAllByRole('row')
            .filter(row => row.getAttribute('aria-disabled') === 'true');
        expect(spacers).toHaveLength(2);
        spacers.forEach(row => expect(parseFloat(row.style.height)).toBeGreaterThan(0));
    });

    test.each([
        ['Name', 'name'],
        ['Modified', 'modified_at'],
        ['Size', 'size'],
    ])('should sort by %s in both directions and reflect the controlled sort', async (label, sortBy) => {
        const user = userEvent.setup();
        const onSort = jest.fn();
        const { rerender } = render(getWrapper({ onSort, sortBy: '', sortDirection: 'ASC' }));

        await user.click(screen.getByRole('columnheader', { name: label }));
        expect(onSort).toHaveBeenLastCalledWith({ sortBy, sortDirection: 'ASC' });

        rerender(getWrapper({ onSort, sortBy, sortDirection: 'ASC' }));
        expect(screen.getByRole('columnheader', { name: label })).toHaveAttribute('aria-sort', 'ascending');

        await user.click(screen.getByRole('columnheader', { name: label }));
        expect(onSort).toHaveBeenLastCalledWith({ sortBy, sortDirection: 'DESC' });

        rerender(getWrapper({ onSort, sortBy, sortDirection: 'DESC' }));
        expect(screen.getByRole('columnheader', { name: label })).toHaveAttribute('aria-sort', 'descending');
    });

    test('should open folders with a click or Enter and leave files inert', async () => {
        const user = userEvent.setup();
        const onItemClick = jest.fn();
        render(getWrapper({ onItemClick }));

        const folderRow = screen.getByRole('row', { name: 'folder' });
        expect(folderRow).toHaveAttribute('data-resin-target', 'folder');
        await user.click(screen.getByText('folder'));
        expect(onItemClick).toHaveBeenCalledTimes(1);
        expect(onItemClick).toHaveBeenLastCalledWith(folder);

        act(() => folderRow.focus());
        await user.keyboard('{Enter}');
        expect(onItemClick).toHaveBeenCalledTimes(2);
        expect(onItemClick).toHaveBeenLastCalledWith(folder);

        await user.click(screen.getByText('file.txt'));
        await user.keyboard('{Enter}');
        expect(onItemClick).toHaveBeenCalledTimes(2);
    });

    test('should show empty folder metadata and formatted file metadata', () => {
        render(getWrapper());

        expect(within(screen.getByRole('row', { name: 'folder' })).getAllByText('--')).toHaveLength(2);
        expect(screen.getByText('1 KB')).toBeVisible();
        expect(screen.getByText('{time, date, medium} at {time, time, short}')).toBeVisible();
    });

    test('should reset scrolling when the item list changes', () => {
        const largeList = Array.from({ length: 500 }, (_, index) => ({
            absolute_path: `file-${index}.txt`,
            name: `file-${index}.txt`,
            size: index,
            type: 'file',
        }));
        const { rerender } = render(getWrapper({ items: largeList }));
        const scrollElement = screen.getByRole('grid').closest<HTMLDivElement>('.bp-ArchiveTableV2')!;
        fireEvent.scroll(scrollElement, { target: { scrollTop: 5600 } });
        expect(scrollElement.scrollTop).toBe(5600);
        expect(screen.getByText('file-100.txt')).toBeVisible();

        rerender(getWrapper({ items }));

        expect(scrollElement.scrollTop).toBe(0);
        fireEvent.scroll(scrollElement);
        expect(screen.getByText('folder')).toBeVisible();
        expect(screen.queryByText('file-100.txt')).not.toBeInTheDocument();
    });
});
