import React from 'react';
import { createRoot } from 'react-dom/client';
import BoxArchive from '../BoxArchive';
import ArchiveExplorer from '../ArchiveExplorer';

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
});
