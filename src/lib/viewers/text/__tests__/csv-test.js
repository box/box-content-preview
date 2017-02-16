/* eslint-disable no-unused-expressions */
import React from 'react';
import '../BoxCSV';
import CSV from '../csv';
import TextBase from '../text-base';
import * as util from '../../../util';

let containerEl;
let options;
let csv;
const sandbox = sinon.sandbox.create();

describe('lib/viewers/text/csv', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/text/__tests__/csv-test.html');
        containerEl = document.querySelector('.container');
        options = {
            container: containerEl,
            file: {
                id: 0
            },
            representation: {
                status: {
                    getPromise: () => Promise.resolve(),
                    destroy: sandbox.stub()
                },
                data: {
                    content: {
                        url_template: 'foo'
                    }
                }
            }
        };

        csv = new CSV(options);
        csv.setup();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        if (typeof csv.destroy === 'function') {
            csv.destroy();
        }
        csv = null;
    });

    describe('setup()', () => {
        it('should set up the container and DOM structure', () => {
            expect(csv.csvEl.parentNode).to.equal(csv.containerEl);
            expect(csv.csvEl).to.have.class('bp-text');
        });
    });

    describe('load()', () => {
        const loadFunc = TextBase.prototype.load;

        afterEach(() => {
            Object.defineProperty(TextBase.prototype, 'load', { value: loadFunc });
        });

        it('should load papaparse worker and call parent load()', () => {
            const blob = {};
            const workerUrl = 'workerUrl';
            sandbox.stub(util, 'createAssetUrlCreator').returns(sandbox.stub().returns(workerUrl));
            sandbox.stub(URL, 'createObjectURL');
            sandbox.stub(window.Papa, 'parse');

            sandbox.stub(csv, 'setup');
            Object.defineProperty(TextBase.prototype, 'load', { value: sandbox.mock() });
            sandbox.stub(csv, 'loadAssets').returns(Promise.resolve());
            sandbox.mock(util).expects('get').withArgs(workerUrl, 'blob').returns(Promise.resolve(blob));
            sandbox.stub(csv, 'finishLoading');

            return csv.load().then(() => {
                expect(URL.createObjectURL).to.have.been.calledWith(blob);
            });
        });

        it('should parse with Papaparse', () => {
            options.representation.data.content.url_template = 'csvUrl{asset_path}';
            csv = new CSV(options);
            csv.setup();

            sandbox.stub(util, 'createAssetUrlCreator').returns(sandbox.stub().returns('someUrl'));
            sandbox.stub(URL, 'createObjectURL');
            sandbox.stub(window.Papa, 'parse');

            sandbox.stub(csv, 'setup');
            Object.defineProperty(TextBase.prototype, 'load', { value: sandbox.stub() });

            csv.options.token = 'token';
            csv.options.sharedLink = 'sharedLink';
            csv.options.sharedLinkPassword = 'sharedLinkPassword';

            sandbox.stub(csv, 'loadAssets').returns(Promise.resolve());

            sandbox.stub(util, 'get').returns(Promise.resolve());
            sandbox.stub(csv, 'finishLoading');

            const csvUrlWithAuth = 'csvUrl?access_token=token&shared_link=sharedLink&shared_link_password=sharedLinkPassword';

            return csv.load().then(() => {
                expect(window.Papa.parse).to.have.been.calledWith(csvUrlWithAuth, {
                    download: true,
                    error: sinon.match.func,
                    complete: sinon.match.func
                });
            });
        });
    });

    describe('resize()', () => {
        const resizeFunc = TextBase.prototype.resize;

        afterEach(() => {
            Object.defineProperty(TextBase.prototype, 'resize', { value: resizeFunc });
        });

        it('should force rendering of CSV and call parent resize', () => {
            Object.defineProperty(TextBase.prototype, 'resize', { value: sandbox.mock() });
            csv.csvComponent = {
                renderCSV: sandbox.mock(),
                destroy: sandbox.stub()
            };

            csv.resize();
        });
    });

    describe('finishLoading()', () => {
        it('should render CSV and finish setting up UI', () => {
            /* eslint-disable react/prefer-es6-class */
            window.BoxCSV = React.createClass({
                destroy: sandbox.stub(),
                renderCSV: sandbox.mock(),
                render: () => { return ''; }
            });
            sandbox.stub(csv, 'loadUI');
            sandbox.stub(csv, 'emit');

            csv.finishLoading();

            expect(csv.loadUI).to.have.been.called;
            expect(csv.loaded).to.be.true;
            expect(csv.emit).to.have.been.calledWith('load');
        });
    });

    // MOVE TO BoxCSV-test.js
    // describe('getRowClassName()', () => {
    //     it('should return appropriate classname for row', () => {
    //         expect(csv.getRowClassName(1)).to.equal('bp-text-csv-odd-row');
    //         expect(csv.getRowClassName(2)).to.equal('bp-text-csv-even-row');
    //     });
    // });

    // describe('cellRenderer()', () => {
    //     it('should render cell with supplied properties', () => {
    //         sandbox.stub(csv, 'getRowClassName').returns('rowClass');
    //         csv.data = [[], [], ['some', 'stuff']];

    //         const cell = csv.cellRenderer({
    //             columnIndex: 1,
    //             key: 'key',
    //             rowIndex: 2,
    //             style: 'style'
    //         });

    //         expect(cell.props.className).to.equal('rowClass bp-text-csv-cell');
    //         expect(cell.props.children).to.equal('stuff');
    //         expect(cell.props.style).to.equal('style');
    //     });
    // });

    // describe('renderCSV()', () => {
    //     it('should render Grid using calculated properties', () => {
    //         const renderStub = sandbox.stub(ReactDOM, 'render');
    //         csv.data = [[1, 2], [2, 3], [3, 4]];

    //         csv.renderCSV();

    //         const gridComponent = renderStub.firstCall.args[0];
    //         expect(gridComponent.props.className).to.equal('bp-text-csv-grid');
    //         expect(gridComponent.props.cellRenderer).to.equal(csv.cellRenderer);
    //         expect(gridComponent.props.columnCount).to.equal(2);
    //         expect(gridComponent.props.rowCount).to.equal(3);
    //         expect(renderStub).to.have.been.calledWith(gridComponent, csv.csvEl);
    //     });
    // });
});
