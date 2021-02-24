/* eslint-disable no-unused-expressions */
import React from 'react'; // eslint-disable-line no-unused-vars
import createReactClass from 'create-react-class';
import Papa from '../../../../third-party/text/2.65.0/papaparse.min.js';
import Api from '../../../api';
import BaseViewer from '../../BaseViewer';
import CSVViewer from '../CSVViewer';
import TextBaseViewer from '../TextBaseViewer';
import { VIEWER_EVENT } from '../../../events';

let containerEl;
let options;
let csv;
const stubs = {};

describe('lib/viewers/text/CSVViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeAll(() => {
        global.Papa = Papa;
    });

    beforeEach(() => {
        fixture.load('viewers/text/__tests__/CSVViewer-test.html');
        containerEl = document.querySelector('.container');
        stubs.api = new Api();
        options = {
            api: stubs.api,
            container: containerEl,
            file: {
                id: 0,
            },
            representation: {
                content: {
                    url_template: 'csvUrl{+asset_path}',
                },
            },
        };

        csv = new CSVViewer(options);
        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
        csv.containerEl = containerEl;
        csv.setup();
    });

    afterEach(() => {
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (typeof csv.destroy === 'function') {
            csv.destroy();
        }
        csv = null;
    });

    describe('setup()', () => {
        test('should set up the container and DOM structure', () => {
            expect(csv.csvEl.parentNode).toBe(csv.containerEl);
            expect(csv.csvEl).toHaveClass('bp-text');
        });
    });

    describe('load()', () => {
        const loadFunc = TextBaseViewer.prototype.load;

        beforeEach(() => {
            jest.spyOn(URL, 'createObjectURL');
            jest.spyOn(window.Papa, 'parse').mockImplementation(() => {});
            jest.spyOn(csv, 'setup');
            jest.spyOn(csv, 'loadAssets').mockResolvedValue(undefined);
            jest.spyOn(csv, 'getRepStatus').mockReturnValue({ getPromise: () => Promise.resolve() });
            jest.spyOn(csv, 'finishLoading');
        });

        afterEach(() => {
            Object.defineProperty(TextBaseViewer.prototype, 'load', { value: loadFunc });
        });

        /* eslint-disable no-undef */
        test('should parse with Papaparse', () => {
            Object.defineProperty(TextBaseViewer.prototype, 'load', { value: jest.fn() });

            csv.options.token = 'token';
            csv.options.sharedLink = 'sharedLink';
            csv.options.sharedLinkPassword = 'sharedLinkPassword';

            const csvUrlWithAuth = `csvUrl/?access_token=token&shared_link=sharedLink&shared_link_password=sharedLinkPassword&box_client_name=${__NAME__}&box_client_version=${__VERSION__}`;

            return csv.load().then(() => {
                expect(window.Papa.parse).toBeCalledWith(
                    csvUrlWithAuth,
                    expect.objectContaining({
                        download: true,
                        error: expect.any(Function),
                        complete: expect.any(Function),
                        worker: true,
                    }),
                );
            });
        });
        /* eslint-enable no-undef */

        test('should invoke startLoadTimer()', () => {
            Object.defineProperty(TextBaseViewer.prototype, 'load', { value: jest.fn() });
            csv.options.token = 'token';
            csv.options.sharedLink = 'sharedLink';
            csv.options.sharedLinkPassword = 'sharedLinkPassword';
            jest.spyOn(csv, 'startLoadTimer');

            return csv.load().then(() => {
                expect(csv.startLoadTimer).toBeCalled();
            });
        });
    });

    describe('prefetch()', () => {
        test('should prefetch assets if assets is true', () => {
            jest.spyOn(csv, 'prefetchAssets').mockImplementation();
            csv.prefetch({ assets: true, content: false });
            expect(csv.prefetchAssets).toBeCalled();
        });

        test('should prefetch content if content is true and representation is ready', () => {
            const contentUrl = 'someContentUrl';
            jest.spyOn(csv, 'createContentUrlWithAuthParams').mockReturnValue(contentUrl);
            jest.spyOn(csv, 'isRepresentationReady').mockReturnValue(true);
            jest.spyOn(csv.api, 'get').mockResolvedValue(undefined);

            csv.prefetch({ assets: false, content: true });

            expect(csv.api.get).toBeCalledWith(contentUrl, { type: 'document' });
        });

        test('should not prefetch content if content is true but representation is not ready', () => {
            jest.spyOn(csv, 'isRepresentationReady').mockReturnValue(false);
            jest.spyOn(csv.api, 'get').mockResolvedValue(undefined);

            csv.prefetch({ assets: false, content: true });

            expect(csv.api.get).not.toBeCalled();
        });
    });

    describe('resize()', () => {
        const resizeFunc = TextBaseViewer.prototype.resize;

        afterEach(() => {
            Object.defineProperty(TextBaseViewer.prototype, 'resize', { value: resizeFunc });
        });

        test('should force rendering of CSV and call parent resize', () => {
            Object.defineProperty(TextBaseViewer.prototype, 'resize', { value: jest.fn() });
            csv.csvComponent = {
                renderCSV: jest.fn(),
                destroy: jest.fn(),
            };

            csv.resize();
        });
    });

    describe('finishLoading()', () => {
        test('should render CSV and finish setting up UI', () => {
            /* eslint-disable react/prefer-es6-class */
            window.BoxCSV = createReactClass({
                destroy: jest.fn(),
                renderCSV: jest.fn(),
                render: () => {
                    return '';
                },
            });
            /* eslint-enable react/prefer-es6-class */
            jest.spyOn(csv, 'loadUI');
            jest.spyOn(csv, 'emit');

            csv.finishLoading();

            expect(csv.loadUI).toBeCalled();
            expect(csv.loaded).toBe(true);
            expect(csv.emit).toBeCalledWith(VIEWER_EVENT.load);
        });
    });

    describe('checkForParseErrors()', () => {
        beforeEach(() => {
            stubs.getWorstParseError = jest.spyOn(csv, 'getWorstParseError').mockImplementation();
            stubs.triggerError = jest.spyOn(csv, 'triggerError').mockImplementation();
        });

        test('should do nothing if no errors', () => {
            csv.checkForParseErrors();

            expect(stubs.triggerError).not.toBeCalled();
        });

        test('should trigger error with a parse error', () => {
            stubs.getWorstParseError.mockReturnValue({ foo: 'bar' });

            csv.checkForParseErrors({ errors: [{ foo: 'bar' }] });

            expect(stubs.triggerError).toBeCalled();
        });
    });

    describe('getWorstParseError()', () => {
        const delimiterError = { type: 'Delimiter' };
        const fieldsMismatchError = { type: 'FieldMismatch', id: 1 };
        const fieldsMismatchError2 = { type: 'FieldMismatch', id: 2 };
        const quotesError = { type: 'Quotes' };

        [
            { name: 'should return undefined if empty array', errors: [], expectedError: undefined },
            {
                name: 'should return delimiter type if present',
                errors: [fieldsMismatchError, delimiterError, quotesError],
                expectedError: delimiterError,
            },
            {
                name: 'should return quotes type if no delimiter type in array',
                errors: [fieldsMismatchError, quotesError],
                expectedError: quotesError,
            },
            {
                name: 'should return fields mismatch type if no other type present',
                errors: [fieldsMismatchError, fieldsMismatchError2],
                expectedError: fieldsMismatchError,
            },
        ].forEach(({ name, errors, expectedError }) => {
            test(`${name}`, () => {
                expect(csv.getWorstParseError(errors)).toEqual(expectedError);
            });
        });
    });
});
