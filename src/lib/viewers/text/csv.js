import autobind from 'autobind-decorator';
import React from 'react';
import ReactDOM from 'react-dom';
import { Grid } from 'react-virtualized';
import TextBase from './text-base';
import { createAssetUrlCreator, get } from '../../util';
import './csv.scss';

const Box = global.Box || {};
const PADDING = 80;
const HEIGHT_ROW = 30;
const WIDTH_SCROLLER = 5;
const WIDTH_COLUMN = 160;
const WIDTH_BORDER = 2;

@autobind
class CSV extends TextBase {

    /**
     * [constructor]
     *
     * @param {string|HTMLElement} container The container
     * @param {Object} options some options
     * @returns {CSV} CSV instance
     */
    constructor(container, options) {
        super(container, options);
        this.csvEl = this.containerEl.appendChild(document.createElement('div'));
        this.csvEl.className = 'bp-text bp-text-csv';
        this.gridComponent = null;
    }

    /**
     * [destructor]
     *
     * @returns {void}
     */
    destroy() {
        if (this.gridComponent) {
            ReactDOM.unmountComponentAtNode(this.csvEl);
            this.gridComponent = null;
        }

        super.destroy();
    }

    /**
     * Loads a csv file.
     *
     * @param {string} csvUrl The text to load
     * @param {string} assetPath The asset path needed to access file
     * @returns {Promise} Promise to load a CSV
     */
    load(csvUrl, assetPath) {
        const assetUrlCreator = createAssetUrlCreator(this.options.location);
        const papaWorkerUrl = assetUrlCreator('third-party/text/papaparse.min.js');

        // Replace asset path in csv url
        const url = csvUrl.replace(/\{asset_path\}/, assetPath);

        get(papaWorkerUrl, 'blob')
        .then((papaWorkerBlob) => {
            const workerSrc = URL.createObjectURL(papaWorkerBlob);

            /* global Papa */
            Papa.SCRIPT_PATH = workerSrc;
            Papa.parse(url, {
                download: true,
                token: this.options.token,
                sharedLink: this.options.sharedLink,
                error: (err, file, inputElem, reason) => {
                    this.emit('error', reason);
                },
                complete: (results) => {
                    if (this.destroyed || !results) {
                        return;
                    }
                    this.data = results.data;
                    this.finishLoading();
                    URL.revokeObjectURL(workerSrc);
                }
            });
        });

        super.load();
    }

    /**
     * Resize handler
     *
     * @override
     * @returns {void}
     * @protected
     */
    resize() {
        this.renderCSV();
        super.resize();
    }

    /**
     * Finishes loading the csv data
     *
     * @returns {void}
     * @private
     */
    finishLoading() {
        this.renderCSV();
        this.loadUI();
        this.loaded = true;
        this.emit('load');
    }

    /**
     * Gets row class name
     *
     * @param {number} row index of the row
     * @returns {string} class name
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
     * @returns {function} Cell renderer function
     * @private
     */
    cellRenderer = ({ columnIndex, key, rowIndex, style }) => {
        const rowClass = this.getRowClassName(rowIndex);
        return <div className={`${rowClass} bp-text-csv-cell`} key={key} style={style}>{this.data[rowIndex][columnIndex]}</div>;
    }
    /* eslint-enable react/prop-types */

    /**
     * Renders CSV into an html table
     *
     * @returns {void}
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

        this.gridComponent = ReactDOM.render(
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

Box.Preview = Box.Preview || {};
Box.Preview.CSV = CSV;
global.Box = Box;
export default CSV;
