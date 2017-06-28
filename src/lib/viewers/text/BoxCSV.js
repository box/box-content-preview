import autobind from 'autobind-decorator';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import Grid from 'react-virtualized/dist/es/Grid/Grid';

const PADDING = 80;
const HEIGHT_ROW = 30;
const WIDTH_SCROLLER = 5;
const WIDTH_COLUMN = 160;
const WIDTH_BORDER = 2;

@autobind class BoxCSV {
    /**
     * [constructor]
     *
     * @return {void}
     */
    constructor(csvEl, data) {
        this.csvEl = csvEl;
        this.data = data;
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        if (this.gridComponent) {
            unmountComponentAtNode(this.csvEl);
            this.gridComponent = null;
        }
    }

    /**
     * Gets row class name
     *
     * @param {number} row - index of the row
     * @return {string} class name
     * @private
     */
    getRowClassName(row) {
        return row % 2 === 0 ? 'bp-text-csv-even-row' : 'bp-text-csv-odd-row';
    }

    /* eslint-disable react/prop-types */
    /**
     * Renders cell
     *
     * @param {Object} cellInfo
     * @param {number} cellInfo.columnIndex
     * @param {string} cellInfo.key
     * @param {number} cellInfo.rowIndex
     * @param {string} cellInfo.style
     * @return {function} Cell renderer function
     * @private
     */
    cellRenderer = ({ columnIndex, key, rowIndex, style }) => {
        const rowClass = this.getRowClassName(rowIndex);
        return (
            <div className={`${rowClass} bp-text-csv-cell`} key={key} style={style}>
                {this.data[rowIndex][columnIndex]}
            </div>
        );
    };
    /* eslint-enable react/prop-types */

    /**
     * Renders CSV into an html table
     *
     * @return {void}
     * @private
     */
    renderCSV() {
        const rowCount = this.data.length;
        const columnCount = this.data[0].length;

        const maxWidth = this.csvEl.clientWidth - PADDING + WIDTH_BORDER;
        const maxHeight = this.csvEl.clientHeight - PADDING + WIDTH_BORDER;

        const calculatedHeight = rowCount * HEIGHT_ROW;
        const calculatedWidth = columnCount * WIDTH_COLUMN;

        let columnWidth = Math.max(maxWidth / columnCount, WIDTH_COLUMN);
        if (calculatedHeight > maxHeight && calculatedWidth < maxWidth) {
            // Re-adjust the columnWidth when there is a vertical scrollbar but not a horizontal one
            columnWidth = (maxWidth - WIDTH_SCROLLER - WIDTH_BORDER) / columnCount;
        }

        this.gridComponent = render(
            <Grid
                className='bp-text-csv-grid'
                cellRenderer={this.cellRenderer}
                width={maxWidth}
                height={Math.min(maxHeight, calculatedHeight)}
                columnCount={columnCount}
                rowHeight={HEIGHT_ROW}
                columnWidth={columnWidth}
                rowCount={rowCount}
            />,
            this.csvEl
        );
    }
}

global.BoxCSV = BoxCSV;
export default BoxCSV;
