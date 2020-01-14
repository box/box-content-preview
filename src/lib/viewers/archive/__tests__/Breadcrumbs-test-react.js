import React from 'react';
import { shallow } from 'enzyme';
import sinon from 'sinon';
import Breadcrumbs from '../Breadcrumbs';
import { ROOT_FOLDER, VIEWS } from '../constants';

const sandbox = sinon.sandbox.create();
let filename;
let fullPath;
let onClick;
let view;

const getComponent = props => shallow(<Breadcrumbs {...props} />);

describe('lib/viewers/archive/Breadcrumbs', () => {
    beforeEach(() => {
        filename = 'test.zip';
        fullPath = 'test/subfolder/';
        onClick = sandbox.stub();
        view = VIEWS.VIEW_FOLDER;
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('render()', () => {
        it('should render correct components', () => {
            const component = getComponent({ filename, fullPath, onClick, view });

            expect(component.find('.bp-Breadcrumbs').length).to.equal(1);
            expect(component.find('InjectIntl(Breadcrumb)').length).to.equal(1);
            expect(component.find('PlainButton').length).to.equal(3);
        });

        it('should render search result if view is search', () => {
            const component = getComponent({ filename, fullPath, onClick, view: VIEWS.VIEW_SEARCH });

            expect(component.find('span').text()).to.equal(__('search_results'));
        });
    });

    describe('getPathItems()', () => {
        it('should return root folder', () => {
            const component = getComponent({ filename, fullPath, onClick, view });
            const pathItems = component.instance().getPathItems(ROOT_FOLDER);

            expect(pathItems).to.eql([
                {
                    name: filename,
                    path: ROOT_FOLDER,
                },
            ]);
        });

        it('should return correct path items', () => {
            const component = getComponent({ filename, fullPath, onClick, view });

            const pathItems = component.instance().getPathItems(fullPath);

            expect(pathItems).to.eql([
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
