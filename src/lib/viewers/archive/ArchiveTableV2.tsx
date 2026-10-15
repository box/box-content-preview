import React from 'react';
import classNames from 'classnames';
import { useVirtualizer } from '@tanstack/react-virtual';
import ReadableTime from 'box-ui-elements/es/components/time/ReadableTime';
import { EMPTY_VALUE } from 'box-ui-elements/es/features/virtualized-table-renderers/constants';
import getSize from 'box-ui-elements/es/utils/size';
import { Cell, Column, DataTableWrapper, Row, Table, TableBody, TableHeader, Text } from '@box/blueprint-web';
import { getFileCategoryByExtension, ItemIcon } from '@box/item-icon';
import { TABLE_COLUMNS } from './constants';
import './ArchiveTableV2.scss';

const { KEY_MODIFIED_AT, KEY_NAME, KEY_SIZE } = TABLE_COLUMNS;

// Blueprint list-item height (the Size14 token), as in frontend-mono's metadata table
const ROW_HEIGHT_PX = 56;

// The header row is row 1, so the first data row is row 2
const FIRST_DATA_ROW_INDEX = 2;

export type ArchiveItem = {
    absolute_path: string;
    modified_at?: string;
    name: string;
    size: number;
    type: string;
};

type SortDirection = 'ASC' | 'DESC';

type Sort = {
    sortBy: string;
    sortDirection: SortDirection;
};

export type Props = {
    items: ArchiveItem[];
    onItemClick: (item: ArchiveItem) => void;
    onSort: (sort: Sort) => void;
    resin?: {
        recordAction: (payload: { action: string; component: string; feature: string; target: string }) => void;
    };
    sortBy: string;
    sortDirection: SortDirection;
};

export default function ArchiveTableV2({
    items,
    onItemClick,
    onSort,
    resin,
    sortBy,
    sortDirection,
}: Props): JSX.Element {
    const scrollRef = React.useRef<HTMLDivElement>(null);

    // React Aria's row press stops the click before Resin's document listener sees it, so the
    // folder open is logged programmatically (precedent: BreadcrumbsV2.tsx)
    const handleFolderAction = (item: ArchiveItem): void => {
        resin?.recordAction({
            action: 'programmatic',
            component: 'archive',
            feature: 'archive',
            target: 'folder',
        });
        onItemClick(item);
    };

    const virtualizer = useVirtualizer({
        count: items.length,
        estimateSize: () => ROW_HEIGHT_PX,
        getItemKey: index => items[index].absolute_path,
        getScrollElement: () => scrollRef.current,
    });

    // The legacy table is pinned to row 0 on every render; do the same when the list changes
    React.useEffect(() => {
        virtualizer.scrollToOffset(0);
    }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

    const virtualItems = virtualizer.getVirtualItems();
    const topOffset = virtualItems.length ? virtualItems[0].start : 0;
    const bottomOffset = virtualItems.length
        ? Math.max(virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end, 0)
        : 0;

    return (
        <DataTableWrapper ref={scrollRef} className="bp-ArchiveTableV2">
            {/* React Aria's Table drops an aria-rowcount prop, so it's set through the ref. Without it a screen
                reader only knows about the rendered window. */}
            <Table
                ref={table => table?.setAttribute('aria-rowcount', String(items.length + 1))}
                aria-label={__('filename')}
                onSortChange={({ column, direction }) =>
                    onSort({ sortBy: String(column), sortDirection: direction === 'descending' ? 'DESC' : 'ASC' })
                }
                sortDescriptor={{ column: sortBy, direction: sortDirection === 'DESC' ? 'descending' : 'ascending' }}
            >
                <TableHeader>
                    <Column key={KEY_NAME} allowsSorting id={KEY_NAME} isRowHeader>
                        <Text as="span">{__('filename')}</Text>
                    </Column>
                    <Column key={KEY_MODIFIED_AT} allowsSorting id={KEY_MODIFIED_AT}>
                        <Text as="span">{__('last_modified_date')}</Text>
                    </Column>
                    <Column key={KEY_SIZE} allowsSorting id={KEY_SIZE}>
                        <Text as="span">{__('size')}</Text>
                    </Column>
                </TableHeader>
                <TableBody>
                    {/* A <table> can't be offset with padding or transforms, so disabled empty rows stand in for
                        the rows that aren't rendered (same approach as frontend-mono's metadata table) */}
                    {topOffset > 0 && <Row isDisabled style={{ height: `${topOffset}px` }} />}
                    {virtualItems.map(({ index }) => {
                        const item = items[index];
                        const isFolder = item.type === 'folder';
                        const extension = item.name.includes('.')
                            ? item.name.slice(item.name.lastIndexOf('.') + 1).toLowerCase()
                            : '';

                        return (
                            <Row
                                key={item.absolute_path}
                                // React Aria's Row drops an aria-rowindex prop, so it's set through the ref
                                ref={row => row?.setAttribute('aria-rowindex', String(index + FIRST_DATA_ROW_INDEX))}
                                className={classNames('bp-ArchiveTableV2-row', { 'is-folder': isFolder })}
                                id={item.absolute_path}
                                onAction={isFolder ? () => handleFolderAction(item) : undefined}
                                textValue={item.name}
                            >
                                <Cell>
                                    <span className="bp-ArchiveTableV2-name">
                                        <ItemIcon
                                            ariaHidden
                                            iconType={isFolder ? 'folder-plain' : getFileCategoryByExtension(extension)}
                                        />
                                        <Text as="span">{item.name}</Text>
                                    </span>
                                </Cell>
                                <Cell>
                                    {/* ReadableTime needs an intl provider; ArchiveExplorer supplies one with Internationalize */}
                                    <Text as="span">
                                        {item.modified_at ? (
                                            <ReadableTime alwaysShowTime timestamp={Date.parse(item.modified_at)} />
                                        ) : (
                                            EMPTY_VALUE
                                        )}
                                    </Text>
                                </Cell>
                                <Cell>
                                    <Text as="span">{isFolder ? EMPTY_VALUE : getSize(item.size)}</Text>
                                </Cell>
                            </Row>
                        );
                    })}
                    {bottomOffset > 0 && <Row isDisabled style={{ height: `${bottomOffset}px` }} />}
                </TableBody>
            </Table>
        </DataTableWrapper>
    );
}
