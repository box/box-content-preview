import React from 'react';
import { mount } from 'enzyme';
import SettingsContext, { Context, Menu } from '../SettingsContext';

describe('SettingsContext', () => {
    const getContext = (): Context => ({
        activeMenu: Menu.MAIN,
        setActiveMenu: jest.fn(),
        setActiveRect: jest.fn(),
    });
    const TestComponent = (): JSX.Element => <div className="test">{React.useContext(SettingsContext).activeMenu}</div>;

    test('should populate its context values', () => {
        const wrapper = mount(<TestComponent />, {
            wrappingComponent: SettingsContext.Provider,
            wrappingComponentProps: { value: getContext() },
        });

        expect(wrapper.text()).toBe(Menu.MAIN);
    });
});
