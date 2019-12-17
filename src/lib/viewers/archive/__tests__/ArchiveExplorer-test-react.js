import React from 'react';
import { shallow } from 'enzyme';
import sinon from 'sinon';
import ArchiveExplorer from '../ArchiveExplorer';
import { TABLE_COLUMNS } from '../constants';

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
            expect(component.find('Breadcrumbs').length).to.equal(1);
            expect(component.find('Internationalize').length).to.equal(1);
            expect(component.find('InjectIntl(VirtualizedTable)').length).to.equal(1);
        });
    });

    describe('handleClick()', () => {
        it('should set state when handleClick() is called', () => {
            const component = shallow(<ArchiveExplorer itemCollection={data} />);

            component.instance().handleClick({ name: 'subfolder' });

            expect(component.state().fullPath).to.equal('test/subfolder/');
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
            const { modified_at: modifiedAt, name, size, type, ...rest } = data[0];

            expect(rowData).to.eql({
                [KEY_NAME]: {
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
});
