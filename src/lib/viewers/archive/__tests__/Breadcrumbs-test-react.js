import React from 'react';
import { shallow } from 'enzyme';
import Breadcrumbs from '../Breadcrumbs';
import { ROOT_FOLDER, VIEWS } from '../constants';

describe('lib/viewers/archive/Breadcrumbs', () => {
    const getComponent = props => shallow(<Breadcrumbs {...props} />);

    let filename;
    let fullPath;
    let onClick;
    let view;

    beforeEach(() => {
        filename = 'test.zip';
        fullPath = 'test/subfolder/';
        onClick = jest.fn();
        view = VIEWS.VIEW_FOLDER;
    });

    describe('render()', () => {
        test('should render correct components', () => {
            const component = getComponent({ filename, fullPath, onClick, view });

            expect(component.find('.bp-Breadcrumbs').length).toBe(1);
            expect(component.find('Breadcrumb').length).toBe(1);
            expect(component.find('PlainButton').length).toBe(3);
        });

        test('should render search result if view is search', () => {
            const component = getComponent({ filename, fullPath, onClick, view: VIEWS.VIEW_SEARCH });

            expect(component.find('span').text()).toBe(__('search_results'));
        });
    });

    describe('getPathItems()', () => {
        test('should return root folder', () => {
            const component = getComponent({ filename, fullPath, onClick, view });
            const pathItems = component.instance().getPathItems(ROOT_FOLDER);

            expect(pathItems).toEqual([
                {
                    name: filename,
                    path: ROOT_FOLDER,
                },
            ]);
        });

        test('should return correct path items', () => {
            const component = getComponent({ filename, fullPath, onClick, view });

            const pathItems = component.instance().getPathItems(fullPath);

            expect(pathItems).toEqual([
                {
                    name: filename,
                    path: ROOT_FOLDER,
                },
                {
                    name: 'test',
                    path: 'test/',
                },
                {
                    name: 'subfolder',
                    path: 'test/subfolder/',
                },
            ]);
        });
    });
});
