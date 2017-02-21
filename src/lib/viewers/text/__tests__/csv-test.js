/* eslint-disable no-unused-expressions */
import React from 'react';
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
                content: {
                    url_template: 'csvUrl{asset_path}'
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

        beforeEach(() => {
            sandbox.stub(URL, 'createObjectURL');
            sandbox.stub(window.Papa, 'parse');
            sandbox.stub(csv, 'setup');
            sandbox.stub(csv, 'loadAssets').returns(Promise.resolve());
            sandbox.stub(csv, 'getRepStatus').returns({ getPromise: () => Promise.resolve() });
            sandbox.stub(csv, 'finishLoading');
        });

        afterEach(() => {
            Object.defineProperty(TextBase.prototype, 'load', { value: loadFunc });
        });

        it('should load papaparse worker and call parent load()', () => {
            const blob = {};
            const workerUrl = 'workerUrl';
            sandbox.stub(util, 'createAssetUrlCreator').returns(sandbox.stub().returns(workerUrl));
            Object.defineProperty(TextBase.prototype, 'load', { value: sandbox.mock() });

            sandbox.mock(util).expects('get').withArgs(workerUrl, 'blob').returns(Promise.resolve(blob));

            return csv.load().then(() => {
                expect(URL.createObjectURL).to.be.calledWith(blob);
            });
        });

        it('should parse with Papaparse', () => {
            sandbox.stub(util, 'createAssetUrlCreator').returns(sandbox.stub().returns('someUrl'));
            Object.defineProperty(TextBase.prototype, 'load', { value: sandbox.stub() });

            csv.options.token = 'token';
            csv.options.sharedLink = 'sharedLink';
            csv.options.sharedLinkPassword = 'sharedLinkPassword';

            sandbox.stub(util, 'get').returns(Promise.resolve());

            const csvUrlWithAuth = 'csvUrl?access_token=token&shared_link=sharedLink&shared_link_password=sharedLinkPassword';

            return csv.load().then(() => {
                expect(window.Papa.parse).to.be.calledWith(csvUrlWithAuth, {
                    download: true,
                    error: sinon.match.func,
                    complete: sinon.match.func
                });
            });
        });
    });

    describe('prefetch()', () => {
        it('should prefetch assets if assets is true', () => {
            sandbox.stub(csv, 'prefetchAssets');
            csv.prefetch({ assets: true, content: false });
            expect(csv.prefetchAssets).to.be.called;
        });

        it('should prefetch content if content is true and representation is ready', () => {
            const contentUrl = 'someContentUrl';
            sandbox.stub(csv, 'createContentUrlWithAuthParams').returns(contentUrl);
            sandbox.stub(csv, 'isRepresentationReady').returns(true);
            sandbox.mock(util).expects('get').withArgs(contentUrl, 'any');

            csv.prefetch({ assets: false, content: true });
        });

        it('should not prefetch content if content is true but representation is not ready', () => {
            sandbox.stub(csv, 'isRepresentationReady').returns(false);
            sandbox.mock(util).expects('get').never();
            csv.prefetch({ assets: false, content: true });
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

            expect(csv.loadUI).to.be.called;
            expect(csv.loaded).to.be.true;
            expect(csv.emit).to.be.calledWith('load');
        });
    });
});
