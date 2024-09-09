import '@testing-library/jest-dom';

expect.extend({
    toContainSelector(received, selector) {
        return {
            message: `expected ${received} ${this.isNot ? 'not ' : ''}to contain ${selector}`,
            pass: !!received.querySelector(selector),
        };
    },
});
