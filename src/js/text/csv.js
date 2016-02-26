import '../../css/text/csv.css';
import autobind from 'autobind-decorator';
import TextBase from './text-base';
import fetch from 'isomorphic-fetch';
import Browser from '../browser';
import React from 'react';
import ReactDOM from 'react-dom';
import { Table, Column, Cell } from 'fixed-data-table';
import { createAssetUrlCreator } from '../util';

let Box = global.Box || {};
let Papa = global.Papa;

@autobind
class CSV extends TextBase {

    /**
     * [constructor]
     *
     * @param {String|HTMLElement} container The container
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
     * @param {String} csvUrl The text to load
     * @returns {Promise} Promise to load a CSV
     */
    load(csvUrl) {

        let assetUrlCreator = createAssetUrlCreator(this.options.location);
        let papaWorkerUrl = assetUrlCreator('third-party/text/papaparse.js');

        fetch(papaWorkerUrl)
        .then((response) => response.blob())
        .then((papaWorkerBlob) => {
            Papa.SCRIPT_PATH = URL.createObjectURL(papaWorkerBlob);
            Papa.parse(csvUrl, {
                worker: Browser.getName() !== 'Edge' && Browser.getName() !== 'Explorer', // IE and Edge don't work with worker
                download: true,
                authorization: 'Bearer ' + this.options.token,
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

        if (this.options.ui !== false) {
            this.loadUI();
        }

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
    }

    /**
     * Renders cell
     *
     * @private
     * @param {Number} cellIndex index of cell
     * @returns {function} Cell renderer function
     */
    renderCell(cellIndex) {
        return ({ rowIndex }) => <Cell>{ this.data[rowIndex][cellIndex]}</Cell>;
    }

    /**
     * Renders column
     *
     * @private
     * @returns {Array} columns
     */
    renderColumn() {
        return this.data[0].map((val, cellIndex) => <Column width={150} allowCellsRecycling={true} cell={ this.renderCell(cellIndex) } />);
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
                { this.renderColumn() }
            </Table>,
            this.csvEl
        );
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.CSV = CSV;
global.Box = Box;
export default CSV;
