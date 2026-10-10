import React from 'react';
import { Tooltip, useBlueprintConfiguration } from '@box/blueprint-web';
import { render, screen, within } from '@testing-library/react';
import BlueprintProviders from '../BlueprintProviders';

describe('lib/BlueprintProviders', () => {
    test('should render its children', () => {
        render(
            <BlueprintProviders>
                <button type="button">Child</button>
            </BlueprintProviders>,
        );

        expect(screen.getByRole('button', { name: 'Child' })).toBeInTheDocument();
    });

    test('should provide the default Blueprint configuration', () => {
        let configuration;
        const Consumer = (): null => {
            configuration = useBlueprintConfiguration();
            return null;
        };

        render(
            <BlueprintProviders>
                <Consumer />
            </BlueprintProviders>,
        );

        expect(configuration).toMatchObject({ componentsWithAnimationEnabled: [] });
    });

    test('should portal tooltips into the provided container', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);

        render(
            <BlueprintProviders container={container}>
                <Tooltip content="Zoom in" open>
                    <button type="button">Zoom</button>
                </Tooltip>
            </BlueprintProviders>,
        );

        expect(within(container).getByRole('tooltip')).toHaveTextContent('Zoom in');

        container.remove();
    });
});
