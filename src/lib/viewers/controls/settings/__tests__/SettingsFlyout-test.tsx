import React, { act } from 'react';
import { render, screen } from '@testing-library/react';
import SettingsContext, { Context, Menu } from '../SettingsContext';
import SettingsFlyout from '../SettingsFlyout';

describe('SettingsFlyout', () => {
    const getContext = (): Context => ({
        activeMenu: Menu.MAIN,
        setActiveMenu: jest.fn(),
        setActiveRect: jest.fn(),
    });

    const getWrapper = (props = {}, context = getContext()) =>
        render(
            <SettingsContext.Provider value={context}>
                <SettingsFlyout isOpen={false} {...props} />
            </SettingsContext.Provider>,
        );

    const getSettingsFlyout = async () => screen.findByTestId('bp-settings-flyout');

    describe('event handlers', () => {
        test('should set classes based on the transitionstart/end events', async () => {
            getWrapper();
            const settingsFlyout = await getSettingsFlyout();

            expect(settingsFlyout).not.toHaveClass('bp-is-transitioning');

            await act(() => settingsFlyout.dispatchEvent(new Event('transitionstart')));
            expect(settingsFlyout).toHaveClass('bp-is-transitioning');

            await act(() => settingsFlyout.dispatchEvent(new Event('transitionend')));
            expect(settingsFlyout).not.toHaveClass('bp-is-transitioning');
        });
    });

    describe('render', () => {
        test.each([true, false])('should set classes based on the isOpen prop %s', async isOpen => {
            getWrapper({ isOpen });
            const settingsFlyout = await getSettingsFlyout();

            if (isOpen) {
                expect(settingsFlyout).toHaveClass('bp-is-open');
            } else {
                expect(settingsFlyout).not.toHaveClass('bp-is-open');
            }
        });

        test('should set styles based on the provided height and width, if present', async () => {
            const activeRect = { bottom: 0, left: 0, height: 100, right: 0, top: 0, width: 100 };
            getWrapper({ height: activeRect.height, width: activeRect.width });
            const settingsFlyout = await getSettingsFlyout();

            expect(settingsFlyout).toHaveStyle({
                height: '100px',
                width: '100px',
            });
        });

        test('should set styles based on defaults if height and width is not present', async () => {
            getWrapper();
            const settingsFlyout = await getSettingsFlyout();

            expect(settingsFlyout).toHaveStyle({
                height: 'auto',
                width: 'auto',
            });
        });

        test('should return a valid wrapper', async () => {
            getWrapper();
            const settingsFlyout = await getSettingsFlyout();

            expect(settingsFlyout).toBeInTheDocument();
        });
    });
});
