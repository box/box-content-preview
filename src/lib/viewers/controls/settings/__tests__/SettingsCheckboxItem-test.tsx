import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsCheckboxItem from '../SettingsCheckboxItem';

describe('SettingsCheckboxItem', () => {
    const getWrapper = (props = {}) =>
        render(<SettingsCheckboxItem isChecked label="label" onChange={jest.fn()} {...props} />);
    const getCheckbox = async () => screen.findByRole('checkbox');

    describe('onChange()', () => {
        test.each([true, false])(
            'should call onChange with the new checked value when initially %s',
            async isChecked => {
                const nextIsChecked = !isChecked;
                const onChange = jest.fn();
                getWrapper({ isChecked, onChange });
                const checkbox = await getCheckbox();

                await userEvent.click(checkbox);

                expect(onChange).toHaveBeenCalledWith(nextIsChecked);
            },
        );
    });

    describe('render', () => {
        test('should return a valid wrapper', async () => {
            const label = 'foo';
            getWrapper({ label });
            const checkbox = await getCheckbox();

            expect(checkbox).toBeInTheDocument();
            expect(await screen.findByText(label)).toBeInTheDocument();
        });

        test.each([true, false])('should set checked attribute as when specified as %s', async isChecked => {
            getWrapper({ isChecked });
            const checkbox = await getCheckbox();

            if (isChecked) {
                expect(checkbox).toBeChecked();
            } else {
                expect(checkbox).not.toBeChecked();
            }
        });
    });
});
