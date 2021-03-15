import React from 'react';
import { mount } from 'enzyme';
import MediaSettingsContext, { Context, Menu } from '../MediaSettingsContext';

describe('MediaSettingsContext', () => {
    const getContext = (): Context => ({
        activeMenu: Menu.MAIN,
        setActiveMenu: jest.fn(),
        setActiveRect: jest.fn(),
    });
    const TestComponent = (): JSX.Element => (
        <div className="test">{React.useContext(MediaSettingsContext).activeMenu}</div>
    );

    test('should populate its context values', () => {
        const wrapper = mount(<TestComponent />, {
            wrappingComponent: MediaSettingsContext.Provider,
            wrappingComponentProps: { value: getContext() },
        });

        expect(wrapper.text()).toBe(Menu.MAIN);
    });
});
