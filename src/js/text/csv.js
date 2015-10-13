'use strict';

import '../../css/text/csv.css';
import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';
import Promise from 'bluebird';
import Base from '../base';

let document = global.document;
let Box = global.Box || {};

const CSV_LOAD_TIMEOUT_IN_MILLIS = 5000;

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
        this.csvEl.classList.add('box-preview-text');
    }

    /**
     * Loads a csv file.
     * @param {String} csvUrl The text to load
     * @public
     * @returns {Promise}
     */
    load(csvUrl) {
        return new Promise((resolve, reject) => {
            fetch(csvUrl).then((response) => {
                return response.text();
            }).then((txt) => {
                this.renderCSV(txt);
                resolve(this);
                this.loaded = true;
                this.emit('load');
            });
            
            setTimeout(() => {
                if (!this.loaded) {
                    reject();
                }
            }, CSV_LOAD_TIMEOUT_IN_MILLIS);
        });
    }

    /**
     * Renders CSV into an html table
     * @param {String} data The csv text to load
     * @public
     * @returns {Promise}
     */
    renderCSV(data) {
        
        // Find all commas that are not inside quotes and replace them with our delimiter
        data = data.replace(/(,)(?=(?:[^"]|"[^"]*")*$)/g, '{{delim}}');
        
        let table = document.createElement('table');
        table.setAttribute('cellspacing', 0);
        table.setAttribute('cellpadding', 0);
        table.className = 'box-preview-csv';
        this.csvEl.appendChild(table);
        
        // Split based on new lines
        var rows = data.split('\n');

        rows.forEach(function(row, index) {
            
            // Create a table row
            let tr = document.createElement('tr');
            
            // Split the columns in the row
            row = row.trim().split('{{delim}}');

            // Iterate over all rows
            row.forEach(function(column) {

                // Create a table column or column header
                let td = index ? document.createElement('td') : document.createElement('th');

                // Append the column to the row
                tr.appendChild(td);

                // Add the data to the column and remove any quotes
                td.textContent = column.replace(/\"/g, '').trim();
            });

            // Append the row to the table
            table.appendChild(tr);
        });
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.CSV = CSV;
global.Box = Box;
export default CSV;