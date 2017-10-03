import React from 'react';
import EventEmitter from 'events';
import { render, unmountComponentAtNode } from 'react-dom';
import { List, AutoSizer, CellMeasurerCache, CellMeasurer } from 'react-virtualized';
import { getDimensionsFromRep } from '../../util';

const ROW_HEIGHT_PADDING = 30;

class ImageDocRenderer extends EventEmitter {
    /**
     * [constructor]
     *
     * @param {HTMLElement} docEl - Document Element
     * @param {number} numPages - Number of document pages
     * @param {string} currentRep - Current page representation
     * @param {string} asset - asset name to use when construct page source URL
     * @param {Function} cb - callback
     * @return {BoxDocRenderer} Instance
     */
    constructor(docEl, numPages, currentRep, asset, cb) {
        super();
        this.docEl = docEl;
        this.currentRep = currentRep;
        this.numPages = numPages;
        this.asset = asset;
        this.createImageSource = cb;
        this.resizePage = this.resizePage.bind(this);
        // this.getRowHeight = this.getRowHeight.bind(this);
        this.pageHeights = {};
        this.cache = new CellMeasurerCache({
            defaultHeight: getDimensionsFromRep(this.currentRep),
            fixedWidth: true
        });
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        if (this.listComponent) {
            unmountComponentAtNode(this.docEl);
            this.docComponent = null;
        }
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
    cellRenderer = ({ index, key, style }) => {
        const { url_template: template } = this.currentRep.content;
        let url = this.createImageSource(template, this.asset);
        url = url.replace(this.asset, `${index + 1}.png`);

        return (
            <CellMeasurer cache={this.cache} columnIndex={0} key={key} parent={parent} rowIndex={index}>
                {({ measure }) => {
                    return (
                        <div style={style} className={'bp-page'} key={key} data-page-number={index + 1}>
                            <img
                                className={'bp-invisible'}
                                onLoad={() => {
                                    this.resizePage(measure, index + 1);
                                }}
                                alt={`page ${index + 1}`}
                                src={url}
                            />
                        </div>
                    );
                }}
            </CellMeasurer>
        );
    };
    /* eslint-enable react/prop-types */

    resizePage(measure, pageNumber) {
        const page = this.docEl.querySelector(`[data-page-number="${pageNumber}"]`);
        const image = page.firstChild;

        const scaleValue = (this.docEl.clientWidth - 30) / image.clientWidth;

        if (image.width !== image.naturalWidth * scaleValue) {
            image.width = image.naturalWidth * scaleValue;
            image.height = image.naturalHeight * scaleValue;
            this.cache.clear(pageNumber - 1);
            measure();

            image.classList.remove('bp-invisible');
        }

        if (pageNumber === 1) {
            this.emit('load');
            this.cache._defaultHeight = image.height + 30;
        }
    }

    resize() {}

    /**
     * Renders the document
     *
     * @return {void}
     * @private
     */
    renderDoc() {
        this.docComponent = render(
            <AutoSizer>
                {({ height, width }) => (
                    <List
                        height={height}
                        width={width}
                        ref={(element) => {
                            this.list = element;
                        }}
                        rowCount={this.numPages}
                        rowHeight={this.cache.rowHeight}
                        rowRenderer={this.cellRenderer}
                        overscanRowCount={10}
                        className={'bp-list'}
                    />
                )}
            </AutoSizer>,
            this.docEl
        );
    }
}

export default ImageDocRenderer;
