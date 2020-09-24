/* eslint-disable no-unused-expressions */
import ReactDOM from 'react-dom';
import BoxArchive from '../BoxArchive';

let archiveComponent;
let containerEl;

describe('lib/viewers/archive/BoxArchive', () => {
    beforeEach(() => {
        fixture.load('viewers/archive/__tests__/BoxArchive-test.html');
        containerEl = document.querySelector('.container');
    });

    afterEach(() => {
        fixture.cleanup();

        if (archiveComponent && typeof archiveComponent.destroy === 'function') {
            archiveComponent.destroy();
        }

        archiveComponent = null;
    });

    describe('destroy()', () => {
        test('should unmount the component', () => {
            jest.spyOn(ReactDOM, 'render').mockImplementation();
            jest.spyOn(ReactDOM, 'unmountComponentAtNode').mockImplementation();

            archiveComponent = new BoxArchive(containerEl, 'test.zip', []);
            archiveComponent.archiveExplorer = {};
            archiveComponent.destroy();
            archiveComponent = null;

            expect(ReactDOM.unmountComponentAtNode).toBeCalled();
        });
    });

    describe('constructor render', () => {
        test('should render archive explorer with the right data', () => {
            jest.spyOn(ReactDOM, 'render').mockImplementation();

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

            archiveComponent = new BoxArchive(containerEl, 'test.zip', data);

            const archiveExplorer = ReactDOM.render.mock.calls[0][0];
            expect(archiveExplorer.props.itemCollection).toBe(data);
        });
    });
});
