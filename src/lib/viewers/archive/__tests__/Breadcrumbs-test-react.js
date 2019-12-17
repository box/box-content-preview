import React from 'react';
import { shallow } from 'enzyme';
import sinon from 'sinon';
import Breadcrumbs from '../Breadcrumbs';
import { VIEWS } from '../constants';

const sandbox = sinon.sandbox.create();
let fullPath;
let onClick;
let view;

describe('lib/viewers/archive/Breadcrumbs', () => {
    beforeEach(() => {
        fullPath = 'test/subfolder/';
        onClick = sandbox.stub();
        view = VIEWS.VIEW_FOLDER;
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('render()', () => {
        it('should render correct components', () => {
            const component = shallow(<Breadcrumbs fullPath={fullPath} onClick={onClick} view={view} />);

            expect(component.find('.bp-Breadcrumbs').length).to.equal(1);
            expect(component.find('InjectIntl(Breadcrumb)').length).to.equal(1);
            expect(component.find('PlainButton').length).to.equal(2);
        });

        it('should render search result if view is search', () => {
            const component = shallow(<Breadcrumbs fullPath={fullPath} onClick={onClick} view={VIEWS.VIEW_SEARCH} />);

            expect(component.find('span').text()).to.equal(__('search_results'));
        });
    });

    describe('getPathItems()', () => {
        it('should return correct path items', () => {
            const component = shallow(<Breadcrumbs fullPath={fullPath} onClick={onClick} view={view} />);

            const pathItems = component.instance().getPathItems(fullPath);

            expect(pathItems).to.eql([
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
