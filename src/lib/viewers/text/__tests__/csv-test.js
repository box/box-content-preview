/* eslint-disable no-unused-expressions */
import ReactDOM from 'react-dom';
import CSV from '../csv';
import * as util from '../../../util';

let containerEl;
let csv;
const sandbox = sinon.sandbox.create();

describe('csv', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/text/__tests__/csv-test.html');
        containerEl = document.querySelector('.container');
        csv = new CSV(containerEl, {
            file: {
                id: 0
            }
        });
    });

    afterEach(() => {
        sandbox.verifyAndRestore();

        if (typeof csv.destroy === 'function') {
            csv.destroy();
        }

        csv = null;
    });

    describe('CSV()', () => {
        it('should set up the container and DOM structure', () => {
            expect(csv.csvEl.parentNode).to.equal(csv.containerEl);
            expect(csv.csvEl.classList.contains('bp-text')).to.be.true;
        });
    });

    describe('load()', () => {
        it('should load papaparse worker and call parent load()', () => {
            const workerUrl = 'workerUrl';
            sandbox.stub(util, 'createAssetUrlCreator').returns(sandbox.stub().returns(workerUrl));

            const blob = {};
            const getPromise = Promise.resolve(blob);
            sandbox.stub(util, 'get').returns(getPromise);
            sandbox.stub(URL, 'createObjectURL');

            sandbox.stub(window.Papa, 'parse');

            const loadFunc = Object.getPrototypeOf(CSV.prototype).load;
            const loadStub = sandbox.stub();
            Object.defineProperty(Object.getPrototypeOf(CSV.prototype), 'load', {
                value: loadStub
            });

            csv.load('');

            expect(util.get).to.have.been.calledWith(workerUrl, 'blob');

            return getPromise.then(() => {
                expect(URL.createObjectURL).to.have.been.calledWith(blob);
                expect(loadStub).to.have.been.called;

                // Restore
                Object.defineProperty(Object.getPrototypeOf(CSV.prototype), 'load', {
                    value: loadFunc
                });
            });
        });

        it('should parse with Papaparse', () => {
            sandbox.stub(util, 'createAssetUrlCreator').returns(sandbox.stub().returns('someUrl'));

            const csvUrl = 'csvUrl';
            const getPromise = Promise.resolve({});
            sandbox.stub(util, 'get').returns(getPromise);
            sandbox.stub(URL, 'createObjectURL');

            sandbox.stub(window.Papa, 'parse');
            const token = 'token';
            const sharedLink = 'sharedLink';
            const sharedLinkPassword = 'sharedLinkPassword';
            csv.options.token = token;
            csv.options.sharedLink = sharedLink;
            csv.options.sharedLinkPassword = sharedLinkPassword;

            const loadFunc = Object.getPrototypeOf(CSV.prototype).load;
            Object.defineProperty(Object.getPrototypeOf(CSV.prototype), 'load', {
                value: sandbox.stub()
            });

            csv.load(csvUrl);

            return getPromise.then(() => {
                expect(window.Papa.parse).to.have.been.calledWith(csvUrl, {
                    download: true,
                    token,
                    sharedLink,
                    sharedLinkPassword,
                    error: sinon.match.func,
                    complete: sinon.match.func
                });

                // Restore
                Object.defineProperty(Object.getPrototypeOf(CSV.prototype), 'load', {
                    value: loadFunc
                });
            });
        });
    });

    describe('finishLoading()', () => {
        it('should render CSV and finish setting up UI', () => {
            sandbox.stub(csv, 'renderCSV');
            sandbox.stub(csv, 'loadUI');
            sandbox.stub(csv, 'emit');

            csv.finishLoading();

            expect(csv.renderCSV).to.have.been.called;
            expect(csv.loadUI).to.have.been.called;
            expect(csv.loaded).to.be.true;
            expect(csv.emit).to.have.been.calledWith('load');
        });
    });

    describe('resize()', () => {
        it('should force rendering of CSV and call parent resize', () => {
            const resizeFunc = Object.getPrototypeOf(CSV.prototype).resize;
            const resizeStub = sandbox.stub();
            Object.defineProperty(Object.getPrototypeOf(CSV.prototype), 'resize', {
                value: resizeStub
            });
            sandbox.stub(csv, 'renderCSV');

            csv.resize();

            expect(csv.renderCSV).to.have.been.called;
            expect(resizeStub).to.have.been.called;

            // Restore
            Object.defineProperty(Object.getPrototypeOf(CSV.prototype), 'resize', {
                value: resizeFunc
            });
        });
    });

    describe('getRowClassName()', () => {
        it('should return appropriate classname for row', () => {
            expect(csv.getRowClassName(1)).to.equal('bp-text-csv-odd-row');
            expect(csv.getRowClassName(2)).to.equal('bp-text-csv-even-row');
        });
    });

    describe('cellRenderer()', () => {
        it('should render cell with supplied properties', () => {
            sandbox.stub(csv, 'getRowClassName').returns('rowClass');
            csv.data = [[], [], ['some', 'stuff']];

            const cell = csv.cellRenderer({
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
            csv.data = [[1, 2], [2, 3], [3, 4]];

            csv.renderCSV();

            const gridComponent = renderStub.firstCall.args[0];
            expect(gridComponent.props.className).to.equal('bp-text-csv-grid');
            expect(gridComponent.props.cellRenderer).to.equal(csv.cellRenderer);
            expect(gridComponent.props.columnCount).to.equal(2);
            expect(gridComponent.props.rowCount).to.equal(3);
            expect(renderStub).to.have.been.calledWith(gridComponent, csv.csvEl);
        });
    });
});
