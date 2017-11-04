import React from 'react';
import EventEmitter from 'events';
import { render, unmountComponentAtNode } from 'react-dom';
import { List, AutoSizer, CellMeasurerCache, CellMeasurer } from 'react-virtualized';
import { getDimensionsFromRep } from '../../util';

const ROW_HEIGHT_PADDING = 30;
const MINIMUM_REP_DIMENSION = 1024;
const MAX_AUTO_SCALE = 1.25;

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
        this.currentScaleValue = 'auto';
        this.cache = new CellMeasurerCache({
            defaultHeight: getDimensionsFromRep(this.currentRep),
            fixedWidth: true
        });

        this.resizePage = this.resizePage.bind(this);
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
     * @private
     * @param {Object} pageInfo - Page data
     * @param {number} pageInfo.columnIndex - Page column index
     * @param {string} pageInfo.key - Page key
     * @param {number} pageInfo.rowIndex - Page row index
     * @param {string} cellInfo.style - Page style
     * @return {Function} Page renderer function
     */
    pageRenderer = ({ index, key, style }) => {
        const { url_template: template } = this.currentRep.content;
        let url = this.createImageSource(template, this.asset);
        url = url.replace(this.asset, `${index + 1}.png`);

        return (
            <CellMeasurer cache={this.cache} columnIndex={0} key={key} parent={parent} rowIndex={index}>
                {({ measure }) => {
                    return (
                        <div style={style} className={'bp-page'} key={key} data-page-number={index + 1}>
                            <img
                                className={'bp-hidden'}
                                onLoad={() => {
                                    this.resizePage(measure, index + 1);
                                }}
                                alt={`page ${index + 1}`}
                                src={url}
                                validate={'always'}
                            />
                        </div>
                    );
                }}
            </CellMeasurer>
        );
    };
    /* eslint-enable react/prop-types */

    /**
     * Resizes a page based on representation and scale value
     *
     * @private
     * @param {Function} measure - The measure function provided by the CellMeasurer component
     * @param {number} pageNumber - The page number to resize
     * @return {void}
     */
    resizePage(measure, pageNumber) {
        if (this.currentScaleValue !== 'auto') {
            return;
        }

        const page = this.docEl.querySelector(`[data-page-number="${pageNumber}"]`);
        const image = page.firstChild;

        const maxScale = MAX_AUTO_SCALE / (getDimensionsFromRep(this.currentRep) / MINIMUM_REP_DIMENSION);
        const scaleValue = Math.min((this.docEl.clientWidth - ROW_HEIGHT_PADDING) / image.naturalWidth, maxScale);

        image.width = image.naturalWidth * scaleValue;
        image.height = image.naturalHeight * scaleValue;

        this.cache.clear(pageNumber - 1);
        measure();
        this.list.recomputeRowHeights(pageNumber - 1);

        image.classList.remove('bp-hidden');

        if (pageNumber === 1) {
            this.emit('load');
            this.cache._defaultHeight = image.height + ROW_HEIGHT_PADDING;
        }
    }

    /**
     * Allows pages to be rerendered on a resize event
     *
     * @public
     * @return {void}
     */
    resize() {
        this.cache.clearAll();
        const renderedPages = this.docEl.querySelectorAll('.bp-page');
        renderedPages.forEach((page) => {
            const image = page.firstChild;
            const src = image.src;
            image.src = null;
            image.src = src;
        });
    }

    /**
     * Renders the document
     *
     * @private
     * @return {void}
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
                        rowRenderer={this.pageRenderer}
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
