import React from 'react';
import { render, screen } from '@testing-library/react';
import TabularDigits, { renderTabularDigits, TABULAR_DIGIT_CLASS } from '../TabularDigits';

const getDigits = (el: HTMLElement): string[] =>
    Array.from(el.querySelectorAll(`.${TABULAR_DIGIT_CLASS}`)).map(digit => digit.textContent ?? '');

describe('TabularDigits', () => {
    test('should wrap each digit in a fixed-width box and leave other characters as text', () => {
        const { container } = render(<TabularDigits>{'1:05 / 2:00'}</TabularDigits>);

        expect(container).toHaveTextContent('1:05 / 2:00');
        expect(getDigits(container)).toEqual(['1', '0', '5', '2', '0', '0']);
    });

    test('should render text without digits as is', () => {
        const { container } = render(<TabularDigits>{'--:--'}</TabularDigits>);

        expect(container).toHaveTextContent('--:--');
        expect(getDigits(container)).toEqual([]);
    });

    test('should update only the changed digits when children change', () => {
        const { container, rerender } = render(<TabularDigits>{'1:05'}</TabularDigits>);
        const ones = container.querySelectorAll(`.${TABULAR_DIGIT_CLASS}`)[2];

        rerender(<TabularDigits>{'1:06'}</TabularDigits>);

        expect(container).toHaveTextContent('1:06');
        expect(container.querySelectorAll(`.${TABULAR_DIGIT_CLASS}`)[2]).toBe(ones);
    });

    test('should hide the boxed digits from screen readers and give them the whole text once', () => {
        render(
            <button type="button">
                <TabularDigits>{'10 / 12'}</TabularDigits>
            </button>,
        );
        const button = screen.getByRole('button', { name: '10 / 12' });

        expect(button.querySelector('[aria-hidden]')).toContainElement(button.querySelector(`.${TABULAR_DIGIT_CLASS}`));
    });
});

describe('renderTabularDigits()', () => {
    let el: HTMLSpanElement;

    beforeEach(() => {
        el = document.createElement('span');
    });

    test('should wrap each digit in a fixed-width box and leave other characters as text', () => {
        renderTabularDigits(el, '01:02:03');

        expect(el.textContent).toBe('01:02:03');
        expect(getDigits(el)).toEqual(['0', '1', '0', '2', '0', '3']);
    });

    test('should update only the changed digits when the layout is the same', () => {
        renderTabularDigits(el, '1:05');
        const [hours, tens, ones] = Array.from(el.querySelectorAll(`.${TABULAR_DIGIT_CLASS}`));

        renderTabularDigits(el, '1:06');

        const digitEls = Array.from(el.querySelectorAll(`.${TABULAR_DIGIT_CLASS}`));
        expect(el.textContent).toBe('1:06');
        expect(digitEls[0]).toBe(hours);
        expect(digitEls[1]).toBe(tens);
        expect(digitEls[2]).toBe(ones);
        expect(ones.textContent).toBe('6');
    });

    test('should rebuild the content when the layout changes', () => {
        renderTabularDigits(el, '9:59');
        const [firstDigit] = Array.from(el.querySelectorAll(`.${TABULAR_DIGIT_CLASS}`));

        renderTabularDigits(el, '10:00');

        expect(el.textContent).toBe('10:00');
        expect(getDigits(el)).toEqual(['1', '0', '0', '0']);
        expect(el.querySelector(`.${TABULAR_DIGIT_CLASS}`)).not.toBe(firstDigit);
    });

    test('should not touch the content when the text is unchanged', () => {
        renderTabularDigits(el, '1:05');
        const replaceChildren = jest.spyOn(el, 'replaceChildren');

        renderTabularDigits(el, '1:05');

        expect(replaceChildren).not.toHaveBeenCalled();
    });
});
