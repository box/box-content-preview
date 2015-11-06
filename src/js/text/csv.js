'use strict';

import '../../css/text/csv.css';
import 'file?name=papaparse.js!../../third-party/papaparse.js';
import autobind from 'autobind-decorator';
import TextBase from './text-base';
import React from 'react';
import ReactDOM from 'react-dom';
import { Table, Column } from 'fixed-data-table';

let Promise = global.Promise;
let document = global.document;
let URL = global.URL;
let Box = global.Box || {};
let Papa = global.Papa;

@autobind
class CSV extends TextBase {

    /**
     * [constructor]
     * @param {string|HTMLElement} event The mousemove event
     * @param {object} [options] some options
     * @returns {Image}
     */
    constructor(container, options) {
        super(container, options);
        this.csvEl = this.containerEl.appendChild(document.createElement('div'));
        this.csvEl.classList.add('box-preview-text-csv');
    }

    /**
     * Loads a csv file.
     * @param {String} csvUrl The text to load
     * @public
     * @returns {Promise}
     */
    load(csvUrl) {
        return new Promise((resolve, reject) => {
            let papaWorkerUrl = this.options.asset.replace('{{asset_name}}', 'papaparse.js');

            fetch(papaWorkerUrl)
                .then((response) => response.blob())
                .then((papaWorkerBlob) => {
                    Papa.SCRIPT_PATH = URL.createObjectURL(papaWorkerBlob);
                    Papa.parse(csvUrl, {
                        worker: true,
                        download: true,
                        error: (err, file, inputElem, reason) => {
                            reject(reason);
                        },
                        complete: (results) => {
                            this.finishLoading(results.data, resolve);
                        }
                    });
                });
        });
    }

    /**
     * Finishes loading the csv data
     *
     * @param {String} data The data content to load
     * @param {Function} resolve Resolution handler
     * @private
     * @returns {void}
     */
    finishLoading(data, resolve) {
        this.renderCSV(data);
        URL.revokeObjectURL(papaWorkerBlob);

        if (this.options.ui !== false) {
            this.loadUI();
        }

        resolve(this);
        this.loaded = true;
        this.emit('load');
    }

    /**
     * Renders CSV into an html table
     * @param {String} data The csv text to load
     * @public
     * @returns {Promise}
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