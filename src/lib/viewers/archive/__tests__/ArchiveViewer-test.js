/* eslint-disable no-unused-expressions */
import createReactClass from 'create-react-class';
import Api from '../../../api';
import ArchiveViewer from '../ArchiveViewer';
import BaseViewer from '../../BaseViewer';
import { ERROR_CODE, VIEWER_EVENT } from '../../../events';
import PreviewError from '../../../PreviewError';

const stubs = {};
let containerEl;
let options;
let archive;

describe('lib/viewers/archive/ArchiveViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    beforeEach(() => {
        fixture.load('viewers/archive/__tests__/ArchiveViewer-test.html');

        /* eslint-disable react/prefer-es6-class */
        window.BoxArchive = createReactClass({
            destroy: jest.fn(),
            render: () => {
                return '';
            },
        });
        /* eslint-enable react/prefer-es6-class */

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
                    url_template: 'archiveUrl{+asset_path}',
                },
            },
        };

        archive = new ArchiveViewer(options);
        Object.defineProperty(BaseViewer.prototype, 'setup', { value: jest.fn() });
        archive.containerEl = containerEl;
        archive.setup();
    });

    afterEach(() => {
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (typeof archive.destroy === 'function') {
            archive.destroy();
        }
        archive = null;
    });

    describe('setup()', () => {
        test('should set up the container and DOM structure', () => {
            expect(archive.archiveEl.parentNode).toBe(archive.containerEl);
            expect(archive.archiveEl).toHaveClass('bp-archive');
        });
    });

    describe('load()', () => {
        const loadFunc = BaseViewer.prototype.load;

        beforeEach(() => {
            jest.spyOn(stubs.api, 'get').mockResolvedValue(undefined);
            jest.spyOn(archive, 'setup').mockImplementation();
            jest.spyOn(archive, 'loadAssets').mockResolvedValue(undefined);
            jest.spyOn(archive, 'getRepStatus').mockReturnValue({ getPromise: () => Promise.resolve() });
            jest.spyOn(archive, 'finishLoading').mockImplementation();
            jest.spyOn(archive, 'startLoadTimer').mockImplementation();
        });

        afterEach(() => {
            Object.defineProperty(BaseViewer.prototype, 'load', { value: loadFunc });
        });

        test('should fetch archive content with Authorization headers', () => {
            Object.defineProperty(BaseViewer.prototype, 'load', { value: jest.fn() });

            const mockHeaders = { Authorization: 'Bearer token' };
            jest.spyOn(archive, 'createContentUrlV2').mockReturnValue('contentUrl');
            jest.spyOn(archive, 'appendAuthHeader').mockReturnValue(mockHeaders);

            return archive.load().then(() => {
                expect(archive.createContentUrlV2).toBeCalledWith('archiveUrl{+asset_path}');
                expect(stubs.api.get).toBeCalledWith('contentUrl', { headers: mockHeaders });
            });
        });

        test('should invoke startLoadTimer()', () => {
            Object.defineProperty(BaseViewer.prototype, 'load', { value: jest.fn() });
            archive.options.token = 'token';
            archive.options.sharedLink = 'sharedLink';
            archive.options.sharedLinkPassword = 'sharedLinkPassword';

            return archive.load().then(() => {
                expect(archive.startLoadTimer).toBeCalled();
            });
        });
    });

    describe('finishLoading()', () => {
        test('should render BoxArchive component and emit load event', () => {
            jest.spyOn(archive, 'emit');

            archive.finishLoading([]);

            expect(archive.loaded).toBe(true);
            expect(archive.emit).toBeCalledWith(VIEWER_EVENT.load);
        });

        describe('archive v2', () => {
            let resolveReady;
            let rejectReady;
            let archiveOptions;

            beforeEach(() => {
                archiveOptions = undefined;
                window.BoxArchive = jest.fn(function BoxArchiveStub(el, name, data, opts) {
                    archiveOptions = opts;
                    this.destroy = jest.fn();
                    this.ready = new Promise((resolve, reject) => {
                        resolveReady = resolve;
                        rejectReady = reject;
                    });
                });
                archive.options.file.name = 'test.zip';
                jest.spyOn(archive, 'emit');
            });

            const enableV2 = () => {
                archive.options.features = { blueprintMigrationArchive: { enabled: true } };
            };

            test('should hold the load event until the v2 module has rendered', async () => {
                enableV2();

                const pending = archive.finishLoading([]);

                expect(archive.emit).not.toBeCalledWith(VIEWER_EVENT.load);
                expect(archive.loaded).toBeFalsy();

                resolveReady();
                await pending;

                expect(archive.loaded).toBe(true);
                expect(archive.emit).toBeCalledWith(VIEWER_EVENT.load);
            });

            test('should throw a load-viewer error if the v2 module fails to load', async () => {
                enableV2();

                const pending = archive.finishLoading([]);
                rejectReady(new Error('chunk failed'));

                await expect(pending).rejects.toBeInstanceOf(PreviewError);
                await expect(pending).rejects.toMatchObject({ code: ERROR_CODE.LOAD_VIEWER });
                expect(archive.emit).not.toBeCalledWith(VIEWER_EVENT.load);
            });

            test('should not emit load if destroyed while the v2 module is loading', async () => {
                enableV2();

                const pending = archive.finishLoading([]);
                jest.spyOn(archive, 'isDestroyed').mockReturnValue(true);
                resolveReady();
                await pending;

                expect(archive.emit).not.toBeCalledWith(VIEWER_EVENT.load);
            });

            test('should enable archive v2 when the archive flag is on', () => {
                enableV2();

                archive.finishLoading([]);

                expect(archiveOptions.isArchiveV2Enabled).toBe(true);
            });

            test('should pass the viewer resin instance to BoxArchive', () => {
                archive.options.resin = { recordAction: jest.fn() };

                archive.finishLoading([]);

                expect(archiveOptions.resin).toBe(archive.options.resin);
            });

            test('should not enable archive v2 when only another wave flag is on', () => {
                archive.options.features = { blueprintMigrationControlsBar: { enabled: true } };

                archive.finishLoading([]);

                expect(archiveOptions.isArchiveV2Enabled).toBe(false);
            });

            test('should not enable archive v2 when no flag is on', () => {
                archive.finishLoading([]);

                expect(archiveOptions.isArchiveV2Enabled).toBe(false);
            });

            test('should not enable archive v2 when the shared Blueprint gate is off', () => {
                enableV2();
                jest.spyOn(archive, 'isBlueprintEnabled').mockReturnValue(false);

                archive.finishLoading([]);

                expect(archiveOptions.isArchiveV2Enabled).toBe(false);
            });
        });
    });
});
