import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import Nav from '@box/blueprint-web-assets/icons/Medium/Nav';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import ToggleTooltipV2 from '../ToggleTooltipV2';

describe('ToggleTooltipV2', () => {
    const getWrapper = () =>
        render(
            <BlueprintProviders>
                <Toolbar.Root>
                    <Toolbar.ToggleGroup type="multiple" value={['thumbnails']}>
                        <ToggleTooltipV2 content="Toggle thumbnails">
                            <Toolbar.ToggleItem aria-label="Thumbnails" icon={Nav} value="thumbnails" />
                        </ToggleTooltipV2>
                    </Toolbar.ToggleGroup>
                </Toolbar.Root>
            </BlueprintProviders>,
        );
    const getToggle = () => screen.getByRole('button', { name: 'Thumbnails' });

    test('should render its child', () => {
        getWrapper();

        expect(getToggle()).toBeInTheDocument();
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('should show the content when the child is hovered', async () => {
        getWrapper();

        await userEvent.hover(getToggle());

        expect(await screen.findByRole('tooltip')).toHaveTextContent('Toggle thumbnails');
    });

    test('should show the content when the child is focused', async () => {
        getWrapper();

        await userEvent.tab();

        expect(getToggle()).toHaveFocus();
        expect(await screen.findByRole('tooltip')).toHaveTextContent('Toggle thumbnails');
    });

    test("should leave the child's data-state intact while the tooltip is open", async () => {
        getWrapper();

        expect(getToggle()).toHaveAttribute('data-state', 'on');

        await userEvent.tab();
        await screen.findByRole('tooltip');

        expect(getToggle()).toHaveAttribute('data-state', 'on');
        expect(getToggle().parentElement).toHaveAttribute('data-state', expect.stringMatching(/open/));
    });
});
