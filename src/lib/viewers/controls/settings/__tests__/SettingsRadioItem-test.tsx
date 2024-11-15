import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsRadioItem from '../SettingsRadioItem';

describe('SettingsRadioItem', () => {
    const getWrapper = (props = {}) =>
        render(<SettingsRadioItem label="1.0" onChange={jest.fn()} value={1} {...props} />);

    const getRadioItem = async () => screen.findByRole('menuitemradio');
    const getIconCheckMark = async () => screen.findByTestId('IconCheckMark24');

    describe('event handlers', () => {
        test('should set the active menu when clicked', async () => {
            const onChange = jest.fn();
            getWrapper({ onChange });
            const radioItem = await getRadioItem();

            await userEvent.click(radioItem);

            expect(onChange).toHaveBeenCalledWith(1);
        });

        test.each`
            key            | calledTimes
            ${'ArrowLeft'} | ${1}
            ${'Enter'}     | ${1}
            ${'Escape'}    | ${0}
            ${'Space'}     | ${1}
        `('should set the active menu $calledTimes times when $key is pressed', async ({ key, calledTimes }) => {
            const onChange = jest.fn();
            getWrapper({ onChange });

            // focus on radio menu item
            await userEvent.tab();
            await userEvent.keyboard(`{${key}}`);

            expect(onChange).toHaveBeenCalledTimes(calledTimes);
        });
    });

    describe('render', () => {
        test.each([true, false])('should set classes based on isSelected prop %s', async isSelected => {
            getWrapper({ isSelected });
            const radioItem = await getRadioItem();

            if (isSelected) {
                expect(radioItem).toHaveClass('bp-is-selected');
            } else {
                expect(radioItem).not.toHaveClass('bp-is-selected');
            }
        });

        test('should return a valid wrapper', async () => {
            getWrapper();
            const radioItem = await getRadioItem();
            const icon = await getIconCheckMark();

            expect(radioItem).toBeInTheDocument();
            expect(screen.getByText('1.0')).toBeInTheDocument();
            expect(icon).toBeInTheDocument(); // Rendered, but visually hidden by default
        });
    });
});
