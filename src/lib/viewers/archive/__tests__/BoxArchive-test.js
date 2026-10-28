import React from 'react';
import { createRoot } from 'react-dom/client';
import BoxArchive from '../BoxArchive';
import ArchiveExplorer from '../ArchiveExplorer';
import BlueprintProviders from '../../../BlueprintProviders';

let archiveComponent;
let containerEl;

jest.mock('react-dom/client', () => ({
    createRoot: jest.fn(),
}));

describe('lib/viewers/archive/BoxArchive', () => {
    beforeEach(() => {
        fixture.load('viewers/archive/__tests__/BoxArchive-test.html');
        containerEl = document.querySelector('.container');

        createRoot.mockReturnValue({
            render: jest.fn(),
            unmount: jest.fn(),
        });
    });

    afterEach(() => {
        fixture.cleanup();

        if (archiveComponent && typeof archiveComponent.destroy === 'function') {
            archiveComponent.destroy();
        }

        archiveComponent = null;

        jest.resetAllMocks();
    });

    describe('destroy()', () => {
        test('should unmount the component', () => {
            archiveComponent = new BoxArchive(containerEl, 'test.zip', []);
            archiveComponent.archiveExplorer = {};
            archiveComponent.destroy();

            expect(archiveComponent.root.unmount).toBeCalled();
        });
    });

    describe('constructor render', () => {
        test('should render archive explorer with correct props', () => {
            const data = [
                {
                    type: 'folder',
                    absolute_path: 'test/',
                    name: 'test',
                    modified_at: '19-Dec-02 16:43',
                    size: 0,
                    item_collection: [],
                },
            ];

            const filename = 'test.zip';

            archiveComponent = new BoxArchive(containerEl, filename, data);

            expect(archiveComponent.root.render).toHaveBeenCalledWith(
                <ArchiveExplorer ref={archiveComponent.setRef} filename={filename} itemCollection={data} />,
            );
        });
    });

    describe('archive v2', () => {
        const v2 = {
            ArchiveTableV2: () => null,
            BlueprintProviders,
            BreadcrumbsV2: () => null,
            SearchBarV2: () => null,
        };

        beforeEach(() => {
            jest.spyOn(BoxArchive.prototype, 'importV2').mockImplementation(() => Promise.resolve(v2));
        });

        test('should render synchronously with no ready promise when v2 is off', () => {
            archiveComponent = new BoxArchive(containerEl, 'test.zip', []);

            expect(archiveComponent.ready).toBeUndefined();
            expect(archiveComponent.root.render).toHaveBeenCalledTimes(1);
            expect(BoxArchive.prototype.importV2).not.toHaveBeenCalled();
        });

        test('should wait for the v2 module, then render the explorer inside the providers', async () => {
            archiveComponent = new BoxArchive(containerEl, 'test.zip', [], { isArchiveV2Enabled: true });

            expect(archiveComponent.root.render).not.toHaveBeenCalled();

            await archiveComponent.ready;

            expect(archiveComponent.root.render).toHaveBeenCalledTimes(1);
            const rendered = archiveComponent.root.render.mock.calls[0][0];
            expect(rendered.type).toBe(BlueprintProviders);
            expect(rendered.props.container).toBe(containerEl);
            expect(rendered.props.children.type).toBe(ArchiveExplorer);
            expect(rendered.props.children.props.v2).toBe(v2);
        });

        test('should pass the resin instance to the explorer', async () => {
            const resin = { recordAction: jest.fn() };
            archiveComponent = new BoxArchive(containerEl, 'test.zip', [], { isArchiveV2Enabled: true, resin });

            await archiveComponent.ready;

            expect(archiveComponent.root.render.mock.calls[0][0].props.children.props.resin).toBe(resin);
        });

        test('should not render if destroyed while the v2 module is loading', async () => {
            archiveComponent = new BoxArchive(containerEl, 'test.zip', [], { isArchiveV2Enabled: true });

            archiveComponent.destroy();
            await archiveComponent.ready;

            expect(archiveComponent.root.render).not.toHaveBeenCalled();
        });

        test('should reject ready and render nothing if the v2 module fails to load', async () => {
            BoxArchive.prototype.importV2.mockRejectedValue(new Error('chunk failed'));
            archiveComponent = new BoxArchive(containerEl, 'test.zip', [], { isArchiveV2Enabled: true });

            await expect(archiveComponent.ready).rejects.toThrow('chunk failed');
            expect(archiveComponent.root.render).not.toHaveBeenCalled();
        });
    });
});
