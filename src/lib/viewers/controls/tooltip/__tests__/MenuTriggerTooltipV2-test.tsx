import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import MenuTriggerTooltipV2 from '../MenuTriggerTooltipV2';

describe('MenuTriggerTooltipV2', () => {
    const renderTooltip = (isMenuOpen: boolean) =>
        render(
            <MenuTriggerTooltipV2 content="Settings" isMenuOpen={isMenuOpen}>
                <button type="button">Trigger</button>
            </MenuTriggerTooltipV2>,
            { wrapper: BlueprintProviders },
        );

    test('should show the tooltip on hover while the menu is closed', async () => {
        renderTooltip(false);

        await userEvent.hover(screen.getByRole('button', { name: 'Trigger' }));

        expect(await screen.findByRole('tooltip')).toHaveTextContent('Settings');
    });

    test('should keep the tooltip closed while the menu is open', async () => {
        renderTooltip(true);

        await userEvent.hover(screen.getByRole('button', { name: 'Trigger' }));
        await userEvent.tab();
        await userEvent.tab({ shift: true });

        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
});
