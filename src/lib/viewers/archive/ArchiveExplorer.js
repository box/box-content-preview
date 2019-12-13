import * as React from 'react';
import PropTypes from 'prop-types';
import get from 'lodash/get';
import Internationalize from 'box-ui-elements/es/elements/common/Internationalize';
import {
    readableTimeCellRenderer,
    sizeCellRenderer,
    itemNameCellRenderer,
} from 'box-ui-elements/es/features/virtualized-table-renderers';
import VirtualizedTable from 'box-ui-elements/es/features/virtualized-table';
import { Column } from 'react-virtualized/dist/es/Table/index';
import { TABLE_COLUMNS } from './constants';

const { KEY_NAME, KEY_MODIFIED_AT, KEY_SIZE } = TABLE_COLUMNS;

class ArchiveExplorer extends React.Component {
    static propTypes = {
        itemCollection: PropTypes.arrayOf(
            PropTypes.shape({
                type: PropTypes.string.isRequired,
                absolute_path: PropTypes.string.isRequired,
                name: PropTypes.string.isRequired,
                modified_at: PropTypes.string.isRequired,
                size: PropTypes.number.isRequired,
                path_collection: PropTypes.shape({
                    total_count: PropTypes.number,
                    entries: PropTypes.arrayOf(
                        PropTypes.shape({
                            type: PropTypes.string,
                            absolute_path: PropTypes.string,
                            name: PropTypes.string,
                        }),
                    ),
                }),
                parent: PropTypes.string,
                item_collection: PropTypes.shape({
                    total_count: PropTypes.number,
                    entries: PropTypes.arrayOf(
                        PropTypes.shape({
                            type: PropTypes.string,
                            absolute_path: PropTypes.string.isRequired,
                            name: PropTypes.string,
                        }),
                    ).isRequired,
                }).isRequired,
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

        this.state = {
            fullPath: props.itemCollection.find(info => !info.parent).absolute_path,
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
        const folderInfo = itemCollection.find(item => item.absolute_path === fullPath);
        const subItems = get(folderInfo, 'item_collection.entries');
        if (!subItems) {
            return [];
        }
        const subItemsPath = subItems.map(item => item.absolute_path);

        return itemCollection.filter(item => subItemsPath.includes(item.absolute_path));
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
        const { modified_at: modifiedAt, name, size, type, ...rest } = itemList[index];

        return {
            [KEY_NAME]: {
                isExternal: false,
                name,
                type,
            },
            // TODO: fix when conversion changes it to standard date format
            [KEY_MODIFIED_AT]: `20${modifiedAt}`,
            [KEY_SIZE]: size,
            ...rest,
        };
    };

    /**
     * Handle click event, update fullPath state
     *
     * @param {Object} cellValue - the cell being clicked
     * @return {void}
     */
    handleClick = ({ name }) => {
        const { fullPath } = this.state;
        this.setState({
            fullPath: `${fullPath}${name}/`,
        });
    };

    /**
     * render data
     *
     * @return {jsx} VirtualizedTable
     */
    render() {
        const { itemCollection } = this.props;
        const { fullPath } = this.state;
        const itemList = this.getItemList(itemCollection, fullPath);

        return (
            <Internationalize language="en-us" messages={{}}>
                <VirtualizedTable
                    className="ArchiveFilesTable"
                    rowData={itemList}
                    rowGetter={this.getRowData(itemList)}
                >
                    {intl => [
                        <Column
                            key={KEY_NAME}
                            cellRenderer={itemNameCellRenderer(intl, this.handleClick)}
                            dataKey={KEY_NAME}
                            disableSort
                            flexGrow={3}
                            label={__('filename')}
                            width={1}
                        />,
                        <Column
                            key={KEY_MODIFIED_AT}
                            cellRenderer={readableTimeCellRenderer}
                            dataKey={KEY_MODIFIED_AT}
                            disableSort
                            flexGrow={2}
                            label={__('last_modified_date')}
                            width={1}
                        />,
                        <Column
                            key={KEY_SIZE}
                            cellRenderer={sizeCellRenderer()}
                            dataKey={KEY_SIZE}
                            disableSort
                            flexGrow={1}
                            label={__('size')}
                            width={1}
                        />,
                    ]}
                </VirtualizedTable>
            </Internationalize>
        );
    }
}

export default ArchiveExplorer;
