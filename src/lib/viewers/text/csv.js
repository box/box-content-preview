import './csv.scss';
import autobind from 'autobind-decorator';
import TextBase from './text-base';
import Browser from '../../browser';
import React from 'react';
import ReactDOM from 'react-dom';
import { Table, Column, Cell } from 'fixed-data-table';
import { createAssetUrlCreator, get } from '../../util';

const Box = global.Box || {};

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
        this.csvEl.classList.add('box-preview-text-csv');
    }

    /**
     * Loads a csv file.
     *
     * @public
     * @param {string} csvUrl The text to load
     * @returns {Promise} Promise to load a CSV
     */
    load(csvUrl) {
        /* global Papa */

        const assetUrlCreator = createAssetUrlCreator(this.options.location);
        const papaWorkerUrl = assetUrlCreator('third-party/text/papaparse.js');

        get(papaWorkerUrl, 'blob')
        .then((papaWorkerBlob) => {
            Papa.SCRIPT_PATH = URL.createObjectURL(papaWorkerBlob);
            Papa.parse(csvUrl, {
                worker: Browser.getName() !== 'Edge' && Browser.getName() !== 'Explorer', // IE and Edge don't work with worker
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
                    URL.revokeObjectURL(papaWorkerBlob);
                }
            });
        });

        super.load();
    }

    /**
     * Finishes loading the csv data
     *
     * @private
     * @returns {void}
     */
    finishLoading() {
        this.renderCSV();
        this.loadUI();
        this.loaded = true;
        this.emit('load');
    }

    /**
     * Resize handler
     *
     * @private
     * @returns {void}
     */
    resize() {
        this.renderCSV();
        super.resize();
    }

    /**
     * Renders cell
     *
     * @private
     * @param {number} cellIndex index of cell
     * @returns {function} Cell renderer function
     */
    renderCell(cellIndex) {
        /* eslint-disable react/prop-types */
        return ({ rowIndex }) => <Cell>{this.data[rowIndex][cellIndex]}</Cell>;
        /* eslint-enable react/prop-types */
    }

    /**
     * Renders column
     *
     * @private
     * @returns {Array} columns
     */
    renderColumn() {
        return this.data[0].map((val, cellIndex) => <Column width={150} allowCellsRecycling cell={this.renderCell(cellIndex)} />);
    }

    /**
     * Renders CSV into an html table
     *
     * @private
     * @returns {void}
     */
    renderCSV() {
        ReactDOM.render(
            <Table rowHeight={50} rowsCount={this.data.length} width={this.csvEl.clientWidth} maxHeight={this.csvEl.clientHeight} headerHeight={0}>
                {this.renderColumn()}
            </Table>,
            this.csvEl
        );
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.CSV = CSV;
global.Box = Box;
export default CSV;
