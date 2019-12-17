import React from 'react';
import { shallow } from 'enzyme';
import sinon from 'sinon';
import ArchiveExplorer from '../ArchiveExplorer';
import { TABLE_COLUMNS, VIEWS } from '../constants';

const sandbox = sinon.sandbox.create();
let data;

describe('lib/viewers/archive/ArchiveExplorer', () => {
    beforeEach(() => {
        data = [
            {
                type: 'folder',
                absolute_path: 'test/',
                name: 'test',
                modified_at: '19-Dec-02 16:43',
                size: 0,
                path_collection: { total_count: 0, entries: [] },
                parent: null,
                item_collection: {
                    total_count: 3,
                    entries: [
                        {
                            type: 'file',
                            absolute_path: 'test/csv-level-1.csv',
                            name: 'csv-level-1.csv',
                        },
                        {
                            type: 'file',
                            absolute_path: 'test/test-level-1.jpg',
                            name: 'test-level-1.jpg',
                        },
                    ],
                },
            },
            {
                type: 'file',
                absolute_path: 'test/csv-level-1.csv',
                name: 'csv-level-1.csv',
                modified_at: '19-Nov-04 16:11',
                size: 133,
                path_collection: {
                    total_count: 1,
                    entries: [{ type: 'folder', absolute_path: 'test/', name: 'test' }],
                },
                parent: 'test',
                item_collection: null,
            },
            {
                type: 'file',
                absolute_path: 'test/test-level-1.jpg',
                name: 'test-level-1.jpg',
                modified_at: '19-Nov-08 15:08',
                size: 57379,
                path_collection: {
                    total_count: 1,
                    entries: [{ type: 'folder', absolute_path: 'test/', name: 'test' }],
                },
                parent: 'test',
                item_collection: null,
            },
        ];
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('render()', () => {
        it('should render correct components', () => {
            const component = shallow(<ArchiveExplorer itemCollection={data} />);

            expect(component.find('.bp-ArchiveExplorer').length).to.equal(1);
            expect(component.find('SearchBar').length).to.equal(1);
            expect(component.find('Breadcrumbs').length).to.equal(1);
            expect(component.find('Internationalize').length).to.equal(1);
            expect(component.find('InjectIntl(VirtualizedTable)').length).to.equal(1);
        });
    });

    describe('handleClick()', () => {
        it('should set state when handleClick() is called', () => {
            const component = shallow(<ArchiveExplorer itemCollection={data} />);

            component.instance().handleClick({ fullPath: 'test/subfolder/' });

            expect(component.state().fullPath).to.equal('test/subfolder/');
            expect(component.state().view).to.equal(VIEWS.VIEW_FOLDER);
            expect(component.state().searchQuery).to.equal('');
        });
    });

    describe('handleClickFullPath()', () => {
        it('should set state when handleClickFullPath() is called', () => {
            const component = shallow(<ArchiveExplorer itemCollection={data} />);

            component.instance().handleClickFullPath('test/subfolder/');

            expect(component.state().fullPath).to.equal('test/subfolder/');
        });
    });

    describe('getRowData()', () => {
        it('should return correct row data', () => {
            const component = shallow(<ArchiveExplorer itemCollection={data} />);

            const rowData = component.instance().getRowData(data)({ index: 0 });

            const { KEY_NAME, KEY_MODIFIED_AT, KEY_SIZE } = TABLE_COLUMNS;
            const { absolute_path: fullPath, modified_at: modifiedAt, name, size, type, ...rest } = data[0];

            expect(rowData).to.eql({
                [KEY_NAME]: {
                    fullPath,
                    isExternal: false,
                    name,
                    type,
                },
                [KEY_MODIFIED_AT]: `20${modifiedAt}`,
                [KEY_SIZE]: size,
                ...rest,
            });
        });
    });

    describe('getItemList()', () => {
        it('should return correct item list', () => {
            const component = shallow(<ArchiveExplorer itemCollection={data} />);

            const itemList = component.instance().getItemList(data, 'test/');

            expect(itemList).to.eql([data[1], data[2]]);
        });
    });

    describe('handleSearch()', () => {
        it('should set correct state when search query is not empty', () => {
            const component = shallow(<ArchiveExplorer itemCollection={data} />);

            component.instance().handleSearch('test');
            expect(component.state().searchQuery).to.equal('test');
            expect(component.state().view).to.equal(VIEWS.VIEW_SEARCH);

            component.instance().handleSearch('');
            expect(component.state().searchQuery).to.equal('');
            expect(component.state().view).to.equal(VIEWS.VIEW_FOLDER);

            component.instance().handleSearch(' ');
            expect(component.state().searchQuery).to.equal(' ');
            expect(component.state().view).to.equal(VIEWS.VIEW_FOLDER);
        });
    });

    describe('getSearchResult()', () => {
        it('should return correct item list', () => {
            const component = shallow(<ArchiveExplorer itemCollection={data} />);

            const itemList = component.instance().getSearchResult(data, 'level-1');
            const fuzzyList = component.instance().getSearchResult(data, 'leel1');

            expect(itemList).to.eql([data[1], data[2]]);
            expect(fuzzyList).to.eql([data[1], data[2]]);
        });
    });
});
