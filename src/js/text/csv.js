'use strict';

import '../../css/text/csv.css';
import 'file?name=papaparse.js!../../third-party/papaparse.js';
import autobind from 'autobind-decorator';
import Base from '../base';
import React from 'react';
import ReactDOM from 'react-dom';
import FixedDataTable from 'fixed-data-table';

let Promise = global.Promise;
let document = global.document;
let Box = global.Box || {};
let Papa = global.Papa;

@autobind
class CSV extends Base {

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
            Papa.SCRIPT_PATH = this.options.scripts[0];
            Papa.parse(csvUrl, {
                worker: true,
                download: true,
                error: (err, file, inputElem, reason) => {
                    reject(reason);
                },
                complete: (results) => {
                    resolve(this);
                    this.loaded = true;
                    this.emit('load');
                    this.renderCSV(results.data);
                }
            });
        });
    }

    /**
     * Renders CSV into an html table
     * @param {String} data The csv text to load
     * @public
     * @returns {Promise}
     */
    renderCSV(data) {



        //console.error(data);

        // let columns = [];
        // let cols = data[0];

        // Object.keys(cols).forEach((key, index) => {
        //     columns.push({
        //         name: index
        //     });
        // });

        // ReactDOM.render(<DataGrid dataSource={data} columns={columns}/>, this.csvEl);


        // var React = require('react');
        // var FixedDataTable = require('fixed-data-table');

        let Table = FixedDataTable.Table;
        let Column = FixedDataTable.Column;
        
        ReactDOM.render(
            <Table rowHeight={50} rowGetter={(index) => data[index]} rowsCount={data.length} width={this.csvEl.clientWidth - 100} maxHeight={this.csvEl.clientHeight - 100} headerHeight={10}>
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