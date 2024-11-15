import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsContext, { Context, Menu } from '../SettingsContext';
import SettingsMenuBack from '../SettingsMenuBack';

describe('SettingsMenuBack', () => {
    const getContext = (): Context => ({
        activeMenu: Menu.MAIN,
        setActiveMenu: jest.fn(),
        setActiveRect: jest.fn(),
    });
    const getWrapper = (props = {}, context = getContext()) =>
        render(
            <SettingsContext.Provider value={context}>
                <SettingsMenuBack label="Autoplay" {...props} />
            </SettingsContext.Provider>,
        );

    const getMenuItem = async () => screen.findByRole('menuitem');

    describe('event handlers', () => {
        test('should set the active menu when clicked', async () => {
            const context = getContext();
            getWrapper({}, context);
            const menuItem = await getMenuItem();

            await userEvent.click(menuItem);

            expect(context.setActiveMenu).toHaveBeenCalled();
        });

        test.each`
            key            | calledTimes
            ${'ArrowLeft'} | ${1}
            ${'Enter'}     | ${1}
            ${'Escape'}    | ${0}
            ${'Space'}     | ${1}
        `('should set the active menu $calledTimes times when $key is pressed', async ({ key, calledTimes }) => {
            const context = getContext();
            getWrapper({}, context);

            // focus on menu item
            await userEvent.tab();
            await userEvent.keyboard(`{${key}}`);

            expect(context.setActiveMenu).toHaveBeenCalledTimes(calledTimes);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', async () => {
            getWrapper();
            const menuItem = await getMenuItem();
            const label = screen.getByText('Autoplay');
            const icon = screen.getByTestId('IconArrowLeft24');

            expect(menuItem).toBeInTheDocument();
            expect(label).toBeInTheDocument();
            expect(icon).toBeInTheDocument();
        });
    });
});
