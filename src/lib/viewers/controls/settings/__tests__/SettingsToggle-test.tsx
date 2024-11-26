import React from 'react';
import { render, screen } from '@testing-library/react';
import SettingsToggle from '../SettingsToggle';

describe('SettingsToggle', () => {
    const getWrapper = (props = {}) => render(<SettingsToggle isOpen={false} onClick={jest.fn()} {...props} />);
    const getContainer = async () => screen.findByTestId('bp-settings-toggle-container');
    const getButton = async () => screen.findByRole('button');
    const getIcon = async () => screen.findByTestId('bp-settings-toggle-icon');

    describe('render', () => {
        test('should return a valid wrapper', async () => {
            getWrapper();
            const container = await getContainer();
            const button = await getButton();
            const icon = await getIcon();

            expect(container).toBeInTheDocument();
            expect(icon).toBeInTheDocument();
            expect(button).toBeInTheDocument();
            expect(button).toBe(await screen.findByTitle(__('media_settings')));
        });

        test.each([true, false])('should add or remove class based on isOpen prop', async isOpen => {
            getWrapper({ isOpen });
            const container = await getContainer();

            if (isOpen) {
                expect(container).toHaveClass('bp-is-open');
            } else {
                expect(container).not.toHaveClass('bp-is-open');
            }
        });

        test('should render badge if provided', async () => {
            const Badge = (): React.JSX.Element => (
                <div className="badge" data-testid="badge">
                    Badge
                </div>
            );
            getWrapper({ badge: <Badge /> });

            expect(await screen.findByTestId('badge')).toBeInTheDocument();
        });
    });
});
