/* eslint-disable no-unused-expressions */
import createReactClass from 'create-react-class';
import Api from '../../../api';
import ArchiveViewer from '../ArchiveViewer';
import BaseViewer from '../../BaseViewer';
import { VIEWER_EVENT } from '../../../events';

let containerEl;
let options;
let archive;
const sandbox = sinon.sandbox.create();
const stubs = {};

describe('lib/viewers/archive/ArchiveViewer', () => {
    const setupFunc = BaseViewer.prototype.setup;

    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/archive/__tests__/ArchiveViewer-test.html');
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
        Object.defineProperty(BaseViewer.prototype, 'setup', { value: sandbox.mock() });
        archive.containerEl = containerEl;
        archive.setup();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();

        Object.defineProperty(BaseViewer.prototype, 'setup', { value: setupFunc });

        if (typeof archive.destroy === 'function') {
            archive.destroy();
        }
        archive = null;
    });

    describe('setup()', () => {
        it('should set up the container and DOM structure', () => {
            expect(archive.archiveEl.parentNode).to.equal(archive.containerEl);
            expect(archive.archiveEl).to.have.class('bp-archive');
        });
    });

    describe('load()', () => {
        const loadFunc = BaseViewer.prototype.load;

        beforeEach(() => {
            sandbox.stub(archive, 'setup');
            sandbox.stub(archive, 'loadAssets').returns(Promise.resolve());
            sandbox.stub(archive, 'getRepStatus').returns({ getPromise: () => Promise.resolve() });
            sandbox.stub(archive, 'finishLoading');
        });

        afterEach(() => {
            Object.defineProperty(BaseViewer.prototype, 'load', { value: loadFunc });
        });

        it('should call createContentUrlWithAuthParams with right template', () => {
            Object.defineProperty(BaseViewer.prototype, 'load', { value: sandbox.mock() });

            sandbox.stub(archive, 'createContentUrlWithAuthParams');

            return archive.load().then(() => {
                expect(archive.createContentUrlWithAuthParams).to.be.calledWith('archiveUrl{+asset_path}');
            });
        });

        it('should invoke startLoadTimer()', () => {
            Object.defineProperty(BaseViewer.prototype, 'load', { value: sandbox.stub() });
            archive.options.token = 'token';
            archive.options.sharedLink = 'sharedLink';
            archive.options.sharedLinkPassword = 'sharedLinkPassword';
            sandbox.stub(stubs.api, 'get').returns(Promise.resolve());
            sandbox.stub(archive, 'startLoadTimer');

            return archive.load().then(() => {
                expect(archive.startLoadTimer).to.be.called;
            });
        });
    });

    describe('finishLoading()', () => {
        it('should render BoxArchive component and emit load event', () => {
            /* eslint-disable react/prefer-es6-class */
            window.BoxArchive = createReactClass({
                destroy: sandbox.stub(),
                render: () => {
                    return '';
                },
            });
            /* eslint-enable react/prefer-es6-class */
            sandbox.stub(archive, 'emit');

            archive.finishLoading([]);

            expect(archive.loaded).to.be.true;
            expect(archive.emit).to.be.calledWith(VIEWER_EVENT.load);
        });
    });
});
