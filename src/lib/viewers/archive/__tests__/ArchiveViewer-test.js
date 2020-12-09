/* eslint-disable no-unused-expressions */
import createReactClass from 'create-react-class';
import Api from '../../../api';
import ArchiveViewer from '../ArchiveViewer';
import BaseViewer from '../../BaseViewer';
import { VIEWER_EVENT } from '../../../events';

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

        test('should call createContentUrlWithAuthParams with right template', () => {
            Object.defineProperty(BaseViewer.prototype, 'load', { value: jest.fn() });

            jest.spyOn(archive, 'createContentUrlWithAuthParams');

            return archive.load().then(() => {
                expect(archive.createContentUrlWithAuthParams).toBeCalledWith('archiveUrl{+asset_path}');
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
    });
});
