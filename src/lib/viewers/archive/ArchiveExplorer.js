import * as React from 'react';
import PropTypes from 'prop-types';
import elementsMessages from 'box-elements-messages'; // eslint-disable-line
import intlLocaleData from 'react-intl-locale-data'; // eslint-disable-line
import Internationalize from 'box-ui-elements/es/elements/common/Internationalize';
import VirtualizedTable from 'box-ui-elements/es/features/virtualized-table/VirtualizedTable';
import fuzzySearch from 'box-ui-elements/es/utils/fuzzySearch';
import itemNameCellRenderer from 'box-ui-elements/es/features/virtualized-table-renderers/itemNameCellRenderer';
import readableTimeCellRenderer from 'box-ui-elements/es/features/virtualized-table-renderers/readableTimeCellRenderer';
import sizeCellRenderer from 'box-ui-elements/es/features/virtualized-table-renderers/sizeCellRenderer';
import sortableColumnHeaderRenderer from 'box-ui-elements/es/features/virtualized-table-renderers/sortableColumnHeaderRenderer';
import { AutoSizer, Column, SortDirection } from '@box/react-virtualized';
import { addLocaleData } from 'react-intl';
import Breadcrumbs from './Breadcrumbs';
import SearchBar from './SearchBar';
import { ROOT_FOLDER, TABLE_COLUMNS, VIEWS } from './constants';
import './ArchiveExplorer.scss';

const language = __LANGUAGE__; // eslint-disable-line
const { KEY_NAME, KEY_MODIFIED_AT, KEY_SIZE } = TABLE_COLUMNS;
const { VIEW_FOLDER, VIEW_SEARCH } = VIEWS;

class ArchiveExplorer extends React.Component {
    static propTypes = {
        filename: PropTypes.string.isRequired,
        itemCollection: PropTypes.arrayOf(
            PropTypes.shape({
                type: PropTypes.string.isRequired,
                absolute_path: PropTypes.string.isRequired,
                name: PropTypes.string.isRequired,
                modified_at: PropTypes.string,
                size: PropTypes.number.isRequired,
                item_collection: PropTypes.arrayOf(PropTypes.string),
            }),
        ).isRequired,
    };

    /**
     * [constructor]
     *
     * @param {Object} props - React element properties
     */
    constructor(props) {
        super(props);

        addLocaleData(intlLocaleData);

        this.state = {
            fullPath: ROOT_FOLDER,
            searchQuery: '',
            sortBy: 'name',
            sortDirection: SortDirection.ASC,
            view: VIEW_FOLDER,
        };
    }

    /**
     * Filter itemlist for target folder
     *
     * @param {Array<Object>} itemCollection - raw data
     * @param {string} fullPath - target folder path
     * @return {Array<Object>} filtered itemlist for target folder
     */
    getItemList = (itemCollection, fullPath) => {
        if (fullPath === ROOT_FOLDER) {
            // Trying to find the root items
            // The only way to tell what the root items are
            // is by comparing the name and absolute path,
            // which are the same for files and differ by '/' for folders
            return itemCollection.filter(
                ({ name, absolute_path: path }) => name === path || name === path.slice(0, -1),
            );
        }

        const { item_collection: folderItems = [] } = itemCollection.find(item => item.absolute_path === fullPath);
        return itemCollection.filter(item => folderItems.includes(item.absolute_path));
    };

    /**
     * Prepare data to render
     * Will be passed as row getter into VirtaulizedTable
     *
     * @param {Array<Object>} itemList - list of data object
     * @param {number} index - row index of the data to selected
     * @return {Object} formatted data
     */
    getRowData = itemList => ({ index }) => {
        const { absolute_path: fullPath, modified_at: modifiedAt, name, size, type, ...rest } = itemList[index];

        return {
            [KEY_NAME]: {
                fullPath,
                isExternal: false,
                name,
                type,
                dataAttributes: {
                    'data-resin-target': type,
                },
            },
            [KEY_MODIFIED_AT]: modifiedAt,
            [KEY_SIZE]: type === 'folder' ? null : size,
            ...rest,
        };
    };

    /**
     * Handle item click event, update fullPath state, reset search and view
     *
     * @param {Object} cellValue - the cell being clicked
     * @return {void}
     */
    handleItemClick = ({ fullPath }) => this.setState({ view: VIEW_FOLDER, fullPath, searchQuery: '' });

    /**
     * Handle breadcrumb click event, update fullPath state
     *
     * @param {string} fullPath - target folder path
     * @return {void}
     */
    handleBreadcrumbClick = fullPath => this.setState({ fullPath });

    /**
     * Handle search input, update view state
     *
     * @param {string} query - raw query string in the search bar
     * @return {void}
     */
    handleSearch = query =>
        this.setState({
            searchQuery: query,
            view: query.trim().length >= 2 ? VIEW_SEARCH : VIEW_FOLDER,
        });

    /**
     * Handle sort click
     *
     * @param {object} sort
     * @param {string} sort.sortBy - Used to sort
     * @param {string} sort.sortDirection - Set direction of sort either ASC | DESC
     * @return {void}
     */
    handleSort = ({ sortBy, sortDirection }) => this.setState({ sortBy, sortDirection });

    /**
     * Filter item collection for search query
     *
     * @param {Array<Object>} itemCollection - raw data
     * @param {string} searchQuery - user input
     * @return {Array<Object>} filtered items for search query
     */
    getSearchResult = (itemCollection, searchQuery) => {
        const trimmedQuery = searchQuery.trim();
        return itemCollection.filter(item => fuzzySearch(trimmedQuery, item.name, 0));
    };

    /**
     * Sort the item list depending on the key or direction
     * @param {Array<Object>} itemList - Array of Item objects
     * @return {Array<Object>} filtered items for search query
     */
    sortItemList(itemList) {
        const { sortBy, sortDirection } = this.state;

        if (!sortBy.length) {
            return itemList;
        }

        return itemList.sort((a = {}, b = {}) => {
            // folders are always in front of files
            if (a.type !== b.type) {
                return a.type === 'folder' ? -1 : 1;
            }

            let aItem = a[sortBy];
            let bItem = b[sortBy];

            if (aItem === null || aItem === undefined) {
                return 1;
            }

            if (bItem === null || bItem === undefined) {
                return -1;
            }

            if (sortDirection === SortDirection.DESC) {
                [aItem, bItem] = [bItem, aItem];
            }

            if (typeof aItem === 'number' && typeof bItem === 'number') {
                return aItem - bItem;
            }

            if (typeof aItem === 'string' && typeof bItem === 'string') {
                return aItem.localeCompare(bItem);
            }

            return 0;
        });
    }

    /**
     * render data
     *
     * @return {jsx} VirtualizedTable
     */
    render() {
        const { filename, itemCollection } = this.props;
        const { fullPath, searchQuery, sortBy, sortDirection, view } = this.state;
        const itemList = this.sortItemList(
            view === VIEW_SEARCH
                ? this.getSearchResult(itemCollection, searchQuery)
                : this.getItemList(itemCollection, fullPath),
        );

        return (
            <Internationalize language={language} messages={elementsMessages}>
                <div className="bp-ArchiveExplorer" data-resin-feature="archive">
                    <SearchBar onSearch={this.handleSearch} searchQuery={searchQuery} />
                    <Breadcrumbs
                        filename={filename}
                        fullPath={fullPath}
                        onClick={this.handleBreadcrumbClick}
                        view={view}
                    />
                    <div className="bp-ArchiveExplorer-table">
                        <AutoSizer>
                            {({ height, width }) => (
                                <VirtualizedTable
                                    height={height}
                                    rowData={itemList}
                                    rowGetter={this.getRowData(itemList)}
                                    scrollToIndex={0}
                                    sort={this.handleSort}
                                    sortBy={sortBy}
                                    sortDirection={sortDirection}
                                    width={width}
                                >
                                    {intl => [
                                        <Column
                                            key={KEY_NAME}
                                            cellRenderer={itemNameCellRenderer(intl, this.handleItemClick)}
                                            dataKey={KEY_NAME}
                                            flexGrow={3}
                                            headerRenderer={sortableColumnHeaderRenderer}
                                            label={__('filename')}
                                            width={1}
                                        />,
                                        <Column
                                            key={KEY_MODIFIED_AT}
                                            cellRenderer={readableTimeCellRenderer}
                                            dataKey={KEY_MODIFIED_AT}
                                            flexGrow={2}
                                            headerRenderer={sortableColumnHeaderRenderer}
                                            label={__('last_modified_date')}
                                            width={1}
                                        />,
                                        <Column
                                            key={KEY_SIZE}
                                            cellRenderer={sizeCellRenderer()}
                                            dataKey={KEY_SIZE}
                                            flexGrow={1}
                                            headerRenderer={sortableColumnHeaderRenderer}
                                            label={__('size')}
                                            width={1}
                                        />,
                                    ]}
                                </VirtualizedTable>
                            )}
                        </AutoSizer>
                    </div>
                </div>
            </Internationalize>
        );
    }
}

export default ArchiveExplorer;
