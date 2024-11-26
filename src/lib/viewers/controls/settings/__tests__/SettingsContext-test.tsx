import React from 'react';
import { render, screen } from '@testing-library/react';
import SettingsContext, { Context, Menu } from '../SettingsContext';

describe('SettingsContext', () => {
    const getContext = (): Context => ({
        activeMenu: Menu.MAIN,
        setActiveMenu: jest.fn(),
        setActiveRect: jest.fn(),
    });
    const TestComponent = (): React.JSX.Element => (
        <div className="test">{React.useContext(SettingsContext).activeMenu}</div>
    );

    test('should populate its context values', async () => {
        render(
            <SettingsContext.Provider value={getContext()}>
                <TestComponent />
            </SettingsContext.Provider>,
        );

        expect(await screen.findByText(Menu.MAIN)).toBeInTheDocument();
    });
});
