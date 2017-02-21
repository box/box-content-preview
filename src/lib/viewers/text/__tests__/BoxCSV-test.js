/* eslint-disable no-unused-expressions */
import * as ReactDOM from 'react-dom';
import BoxCSV from '../BoxCSV';

const sandbox = sinon.sandbox.create();
let csvComponent;

describe('lib/viewers/text/BoxCSV', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/text/__tests__/BoxCSV-test.html');
        const containerEl = document.querySelector('.container');
        csvComponent = new BoxCSV(containerEl, {});
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        if (csvComponent && typeof csvComponent.destroy === 'function') {
            csvComponent.destroy();
        }
        csvComponent = null;
    });

    describe('destroy()', () => {
        it('should unmount the component', () => {
            csvComponent.gridComponent = {};
            sandbox.stub(ReactDOM, 'unmountComponentAtNode');

            csvComponent.destroy();

            expect(ReactDOM.unmountComponentAtNode).to.be.called;

            // Don't destroy again
            csvComponent = null;
        });
    });

    describe('getRowClassName()', () => {
        it('should return appropriate classname for row', () => {
            expect(csvComponent.getRowClassName(1)).to.equal('bp-text-csv-odd-row');
            expect(csvComponent.getRowClassName(2)).to.equal('bp-text-csv-even-row');
        });
    });

    describe('cellRenderer()', () => {
        it('should render cell with supplied properties', () => {
            sandbox.stub(csvComponent, 'getRowClassName').returns('rowClass');
            csvComponent.data = [[], [], ['some', 'stuff']];

            const cell = csvComponent.cellRenderer({
                columnIndex: 1,
                key: 'key',
                rowIndex: 2,
                style: 'style'
            });

            expect(cell.props.className).to.equal('rowClass bp-text-csv-cell');
            expect(cell.props.children).to.equal('stuff');
            expect(cell.props.style).to.equal('style');
        });
    });

    describe('renderCSV()', () => {
        it('should render Grid using calculated properties', () => {
            const renderStub = sandbox.stub(ReactDOM, 'render');
            csvComponent.data = [[1, 2], [2, 3], [3, 4]];

            csvComponent.renderCSV();

            const gridComponent = renderStub.firstCall.args[0];
            expect(gridComponent.props.className).to.equal('bp-text-csv-grid');
            expect(gridComponent.props.cellRenderer).to.equal(csvComponent.cellRenderer);
            expect(gridComponent.props.columnCount).to.equal(2);
            expect(gridComponent.props.rowCount).to.equal(3);
            expect(renderStub).to.be.calledWith(gridComponent, csvComponent.csvEl);
        });
    });
});
