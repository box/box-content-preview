'use strict';

import '../../css/text/csv.css';
import 'file?name=papaparse.js!../../third-party/text/papaparse.js';
import autobind from 'autobind-decorator';
import TextBase from './text-base';
import fetch from 'isomorphic-fetch';
import React from 'react';
import ReactDOM from 'react-dom';
import { Table, Column } from 'fixed-data-table';
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

        let assetUrlCreator = createAssetUrlCreator(this.options.location.hrefTemplate);
        let papaWorkerUrl = assetUrlCreator('papaparse.js');

        fetch(papaWorkerUrl)
        .then((response) => response.blob())
        .then((papaWorkerBlob) => {
            Papa.SCRIPT_PATH = URL.createObjectURL(papaWorkerBlob);
            Papa.parse(this.appendAuthParam(csvUrl), {
                worker: true,
                download: true,
                error: (err, file, inputElem, reason) => {
                    this.emit('error', reason);
                },
                complete: (results) => {
                    if (this.destroyed) {
                        return;
                    }
                    this.finishLoading(results.data);
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
     * @param {String} data The data content to load
     * @returns {void}
     */
    finishLoading(data) {
        this.renderCSV(data);

        if (this.options.ui !== false) {
            this.loadUI();
        }

        this.loaded = true;
        this.emit('load');
    }

    /**
     * Renders CSV into an html table
     *
     * @private
     * @param {String} data The csv text to load
     * @returns {void}
     */
    renderCSV(data) {
        ReactDOM.render(
            <Table rowHeight={50} rowGetter={(index) => data[index]} rowsCount={data.length} width={this.csvEl.clientWidth} maxHeight={this.csvEl.clientHeight} headerHeight={10}>
                {data[0].map((object, index) => {
                    return <Column width={150} allowCellsRecycling={true} dataKey={index} />;
                })}
            </Table>,
            this.csvEl
        );
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.CSV = CSV;
global.Box = Box;
export default CSV;