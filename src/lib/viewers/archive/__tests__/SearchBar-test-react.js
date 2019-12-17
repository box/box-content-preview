import React from 'react';
import { shallow } from 'enzyme';
import sinon from 'sinon';
import SearchBar from '../SearchBar';

const sandbox = sinon.sandbox.create();
let searchQuery;
let onSearch;

describe('lib/viewers/archive/SearchBar', () => {
    beforeEach(() => {
        searchQuery = 'test';
        onSearch = sandbox.stub();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('render()', () => {
        it('should render correct components', () => {
            const component = shallow(<SearchBar onSearch={onSearch} searchQuery={searchQuery} />);

            expect(component.find('.bp-SearchBar').length).to.equal(1);
            expect(component.find('input').length).to.equal(1);
        });
    });
});
