import '@testing-library/jest-dom';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import Enzyme, { mount, shallow } from 'enzyme';

expect.extend({
    toContainSelector(received, selector) {
        return {
            message: `expected ${received} ${this.isNot ? 'not ' : ''}to contain ${selector}`,
            pass: !!received.querySelector(selector),
        };
    },
});

Enzyme.configure({ adapter: new Adapter() });

// Make Enzyme functions available in all test files without importing
global.shallow = shallow;
global.mount = mount;
