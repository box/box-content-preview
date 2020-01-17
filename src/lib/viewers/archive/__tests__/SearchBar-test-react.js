import React from 'react';
import { shallow } from 'enzyme';
import sinon from 'sinon';
import SearchBar from '../SearchBar';

const sandbox = sinon.createSandbox();
let searchQuery;
let onSearch;

describe('lib/viewers/archive/SearchBar', () => {
    beforeEach(() => {
        searchQuery = 'test';
        onSearch = jest.fn();
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
    });

    describe('render()', () => {
        test('should render correct components', () => {
            const component = shallow(<SearchBar onSearch={onSearch} searchQuery={searchQuery} />);

            expect(component.find('.bp-SearchBar').length).toBe(1);
            expect(component.find('input').length).toBe(1);
        });
    });
});
