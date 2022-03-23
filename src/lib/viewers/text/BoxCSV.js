import React from 'react';
import ReactDOM from 'react-dom';
import { Grid } from '@box/react-virtualized/dist/es/Grid';

const HEIGHT_ROW = 30;
const WIDTH_SCROLLER = 5;
const WIDTH_COLUMN = 160;
const WIDTH_BORDER = 2;

class BoxCSV {
    /**
     * [constructor]
     *
     * @param {HTMLElement} csvEl - CSV element
     * @param {Object} data - CSV data
     * @return {BoxCSV} Instance
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
            ReactDOM.unmountComponentAtNode(this.csvEl);
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
     * @param {Object} cellInfo - Cell data
     * @param {number} cellInfo.columnIndex - Cell column index
     * @param {string} cellInfo.key - Cell key
     * @param {number} cellInfo.rowIndex - Cell row index
     * @param {string} cellInfo.style - Cell style
     * @return {Function} Cell renderer function
     * @private
     */
    cellRenderer = ({ columnIndex, key, rowIndex, style }) => {
        const rowClass = this.getRowClassName(rowIndex);
        return (
            <div key={key} className={`${rowClass} bp-text-csv-cell`} style={style}>
                {this.data[rowIndex][columnIndex]}
            </div>
        );
    };
    /* eslint-enable react/prop-types */

    setRef = gridComponent => {
        this.gridComponent = gridComponent;
    };

    /**
     * Renders CSV into an html table
     *
     * @return {void}
     * @private
     */
    renderCSV() {
        const rowData = [...this.data];
        const rowCount = rowData.length;
        const rowSample = rowData.sort((a, b) => b.length - a.length)[0]; // Find the row with the most columns
        const columnCount = rowSample.length;

        const maxWidth = this.csvEl.clientWidth;
        const maxHeight = this.csvEl.clientHeight;

        const calculatedHeight = rowCount * HEIGHT_ROW;
        const calculatedWidth = columnCount * WIDTH_COLUMN;

        let columnWidth = Math.max(maxWidth / columnCount, WIDTH_COLUMN);
        if (calculatedHeight > maxHeight && calculatedWidth < maxWidth) {
            // Re-adjust the columnWidth when there is a vertical scrollbar but not a horizontal one
            columnWidth = (maxWidth - WIDTH_SCROLLER - WIDTH_BORDER) / columnCount;
        }

        ReactDOM.render(
            <Grid
                ref={this.setRef}
                cellRenderer={this.cellRenderer}
                className="bp-text-csv-grid"
                columnCount={columnCount}
                columnWidth={columnWidth}
                height={Math.min(maxHeight, calculatedHeight)}
                rowCount={rowCount}
                rowHeight={HEIGHT_ROW}
                width={maxWidth}
            />,
            this.csvEl,
        );
    }
}

global.BoxCSV = BoxCSV;
export default BoxCSV;
