/* eslint-disable no-unused-expressions */
import React from 'react';
import createReactClass from 'create-react-class';
import CSVViewer from '../CSVViewer';
import TextBaseViewer from '../TextBaseViewer';
import BaseViewer from '../../BaseViewer';
import * as util from '../../../util';
import { VIEWER_EVENT } from '../../../events';

let containerEl;
let options;
let csv;
const sandbox = sinon.sandbox.create();

describe('lib/viewers/text/CSVViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/text/__tests__/CSVViewer-test.html');
        containerEl = document.querySelector('.container');
        options = {
            container: containerEl,
            file: {
                id: 0
            },
            representation: {
                content: {
                    url_template: 'csvUrl{+asset_path}'
                }
            }
        };

        csv = new CSVViewer(options);
        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.mock() });
        csv.containerEl = containerEl;
        csv.setup();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

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
        const loadFunc = TextBaseViewer.prototype.load;

        beforeEach(() => {
            sandbox.stub(URL, 'createObjectURL');
            sandbox.stub(window.Papa, 'parse');
            sandbox.stub(csv, 'setup');
            sandbox.stub(csv, 'loadAssets').returns(Promise.resolve());
            sandbox.stub(csv, 'getRepStatus').returns({ getPromise: () => Promise.resolve() });
            sandbox.stub(csv, 'finishLoading');
        });

        afterEach(() => {
            Object.defineProperty(TextBaseViewer.prototype, 'load', { value: loadFunc });
        });

        it('should load papaparse worker and call parent load()', () => {
            const blob = {};
            const workerUrl = 'workerUrl';
            sandbox.stub(util, 'createAssetUrlCreator').returns(sandbox.stub().returns(workerUrl));
            Object.defineProperty(TextBaseViewer.prototype, 'load', { value: sandbox.mock() });

            sandbox.mock(util).expects('get').withArgs(workerUrl, 'blob').returns(Promise.resolve(blob));

            return csv.load().then(() => {
                expect(URL.createObjectURL).to.be.calledWith(blob);
            });
        });

        /* eslint-disable no-undef */
        it('should parse with Papaparse', () => {
            sandbox.stub(util, 'createAssetUrlCreator').returns(sandbox.stub().returns('someUrl'));
            Object.defineProperty(TextBaseViewer.prototype, 'load', { value: sandbox.stub() });

            csv.options.token = 'token';
            csv.options.sharedLink = 'sharedLink';
            csv.options.sharedLinkPassword = 'sharedLinkPassword';

            sandbox.stub(util, 'get').returns(Promise.resolve());

            const csvUrlWithAuth = `csvUrl/?access_token=token&shared_link=sharedLink&shared_link_password=sharedLinkPassword&box_client_name=${__NAME__}&box_client_version=${__VERSION__}`;

            return csv.load().then(() => {
                expect(window.Papa.parse).to.be.calledWith(csvUrlWithAuth, {
                    download: true,
                    error: sinon.match.func,
                    complete: sinon.match.func
                });
            });
        });
        /* eslint-enable no-undef */
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
        const resizeFunc = TextBaseViewer.prototype.resize;

        afterEach(() => {
            Object.defineProperty(TextBaseViewer.prototype, 'resize', { value: resizeFunc });
        });

        it('should force rendering of CSV and call parent resize', () => {
            Object.defineProperty(TextBaseViewer.prototype, 'resize', { value: sandbox.mock() });
            csv.csvComponent = {
                renderCSV: sandbox.mock(),
                destroy: sandbox.stub()
            };

            csv.resize();
        });
    });

    describe('finishLoading()', () => {
        it('should render CSV and finish setting up UI', () => {
            window.BoxCSV = createReactClass({
                destroy: sandbox.stub(),
                renderCSV: sandbox.mock(),
                render: () => {
                    return '';
                }
            });
            sandbox.stub(csv, 'loadUI');
            sandbox.stub(csv, 'emit');

            csv.finishLoading();

            expect(csv.loadUI).to.be.called;
            expect(csv.loaded).to.be.true;
            expect(csv.emit).to.be.calledWith(VIEWER_EVENT.load);
        });
    });
});
