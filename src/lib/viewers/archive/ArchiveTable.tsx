import React from 'react';
import { Text } from '@box/blueprint-web';
import { Column, SortDirection, Table } from '@box/react-virtualized';
import FileCode from '@box/blueprint-web-assets/icons/Content/FileCode';
import FileDefault from '@box/blueprint-web-assets/icons/Content/FileDefault';
import FileExcel from '@box/blueprint-web-assets/icons/Content/FileExcel';
import FileImage from '@box/blueprint-web-assets/icons/Content/FileImage';
import FilePdf from '@box/blueprint-web-assets/icons/Content/FilePdf';
import FileText from '@box/blueprint-web-assets/icons/Content/FileText';
import FileZip from '@box/blueprint-web-assets/icons/Content/FileZip';
import FolderPersonal from '@box/blueprint-web-assets/icons/Content/FolderPersonal';
import ChevronDown from '@box/blueprint-web-assets/icons/Medium/ChevronDown';
import { TABLE_COLUMNS } from './constants';
import './ArchiveTable.scss';

// All Files uses a 3.5rem row (--bp-size-140) and a 2.5rem header (--bp-size-100).
// react-virtualized needs those as pixels. Blueprint's DataTable renders every row,
// so a large archive stays on this grid and only mounts the rows in view.
const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 56;
const { KEY_MODIFIED_AT, KEY_NAME, KEY_SIZE } = TABLE_COLUMNS;

const FILE_ICONS: Record<string, typeof FileDefault> = {
    csv: FileExcel,
    jpg: FileImage,
    jpeg: FileImage,
    pdf: FilePdf,
    png: FileImage,
    txt: FileText,
    xml: FileCode,
    zip: FileZip,
};

export type ArchiveItem = {
    absolute_path: string;
    modified_at?: string;
    name: string;
    size: number;
    type: string;
};

type Props = {
    height: number;
    itemList: ArchiveItem[];
    onItemClick: (item: { fullPath: string }) => void;
    onSort: (sort: { sortBy: string; sortDirection: string }) => void;
    sortBy: string;
    sortDirection: string;
    width: number;
};

type HeaderParams = {
    dataKey: string;
    label: string;
    sortBy: string;
    sortDirection: string;
};

const formatSize = (bytes: number): string => {
    if (!bytes) {
        return '0 Byte';
    }

    const kilo = 1024;
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const exp = Math.floor(Math.log(bytes) / Math.log(kilo));

    return `${parseFloat((bytes / kilo ** exp).toFixed(2))} ${units[exp]}`;
};

const fileIconFor = (name: string): typeof FileDefault => {
    const extension =
        name
            .split('.')
            .pop()
            ?.toLowerCase() ?? '';

    return FILE_ICONS[extension] ?? FileDefault;
};

const renderNameCell = (onItemClick: Props['onItemClick']) => ({ rowData }: { rowData: ArchiveItem }): JSX.Element => {
    const Icon = rowData.type === 'folder' ? FolderPersonal : fileIconFor(rowData.name);

    return (
        <span className="bp-ArchiveTable-name" title={rowData.name}>
            <Icon aria-hidden className="bp-ArchiveTable-icon" />
            {rowData.type === 'folder' ? (
                <button
                    className="bp-ArchiveTable-folderButton"
                    data-resin-target="folder"
                    data-target-id="ArchiveExplorer-openFolder"
                    onClick={(): void => onItemClick({ fullPath: rowData.absolute_path })}
                    type="button"
                >
                    <Text as="span" variant="bodySmallSemibold">
                        {rowData.name}
                    </Text>
                </button>
            ) : (
                <Text as="span" data-resin-target="file" variant="bodySmallSemibold">
                    {rowData.name}
                </Text>
            )}
        </span>
    );
};

const renderMetaCell = (value: string): JSX.Element => (
    <Text as="span" className="bp-ArchiveTable-meta" color="textOnLightSecondary" variant="bodyDefault">
        {value}
    </Text>
);

const renderModifiedCell = ({ cellData }: { cellData?: string }): JSX.Element => renderMetaCell(cellData || '--');

const renderSizeCell = ({ rowData }: { rowData: ArchiveItem }): JSX.Element =>
    renderMetaCell(rowData.type === 'folder' ? '--' : formatSize(rowData.size));

const renderHeader = ({ dataKey, label, sortBy, sortDirection }: HeaderParams): JSX.Element => {
    const isSorted = dataKey === sortBy;

    return (
        <span className={`bp-ArchiveTable-header${isSorted ? ' bp-ArchiveTable-header--sorted' : ''}`}>
            <Text as="span" color={isSorted ? 'textOnLightDefault' : 'textOnLightSecondary'} variant="caption">
                {label}
            </Text>
            {isSorted && (
                <ChevronDown
                    aria-hidden
                    className={`bp-ArchiveTable-sortIcon${
                        sortDirection === SortDirection.ASC ? ' bp-ArchiveTable-sortIcon--asc' : ''
                    }`}
                />
            )}
        </span>
    );
};

const getRow = (itemList: ArchiveItem[]) => ({ index }: { index: number }): ArchiveItem => itemList[index];

export default function ArchiveTable({
    height,
    itemList,
    onItemClick,
    onSort,
    sortBy,
    sortDirection,
    width,
}: Props): JSX.Element {
    return (
        <Table
            className="bp-ArchiveTable"
            headerHeight={HEADER_HEIGHT}
            height={height}
            rowCount={itemList.length}
            rowGetter={getRow(itemList)}
            rowHeight={ROW_HEIGHT}
            scrollToIndex={0}
            sort={onSort}
            sortBy={sortBy}
            sortDirection={sortDirection}
            width={width}
        >
            <Column
                cellRenderer={renderNameCell(onItemClick)}
                dataKey={KEY_NAME}
                flexGrow={3}
                headerRenderer={renderHeader}
                label={__('filename')}
                width={1}
            />
            <Column
                cellRenderer={renderModifiedCell}
                dataKey={KEY_MODIFIED_AT}
                flexGrow={2}
                headerRenderer={renderHeader}
                label={__('last_modified_date')}
                width={1}
            />
            <Column
                cellRenderer={renderSizeCell}
                dataKey={KEY_SIZE}
                flexGrow={1}
                headerRenderer={renderHeader}
                label={__('size')}
                width={1}
            />
        </Table>
    );
}
