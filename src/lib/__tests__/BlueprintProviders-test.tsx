import React from 'react';
import { BlueprintConfigurationOptions, Tooltip, useBlueprintConfiguration } from '@box/blueprint-web';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import BlueprintProviders, { PortalContainerContext } from '../BlueprintProviders';
import { HOST_INTER_FONT_CLASS } from '../useHostInterFont';

describe('lib/BlueprintProviders', () => {
    afterEach(() => {
        cleanup();
        document.body.classList.remove(HOST_INTER_FONT_CLASS);
    });

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

        expect(configuration).toMatchObject({
            componentsWithAnimationEnabled: [],
            typography: BlueprintConfigurationOptions.typography.lato,
        });
    });

    test('should use Inter when the host has marked body', () => {
        document.body.classList.add(HOST_INTER_FONT_CLASS);

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

        expect(configuration).toMatchObject({ typography: BlueprintConfigurationOptions.typography.inter });
    });

    test('should follow the host class when it changes after mount', async () => {
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

        expect(configuration).toMatchObject({ typography: BlueprintConfigurationOptions.typography.lato });

        await act(async () => {
            document.body.classList.add(HOST_INTER_FONT_CLASS);
        });

        expect(configuration).toMatchObject({ typography: BlueprintConfigurationOptions.typography.inter });

        await act(async () => {
            document.body.classList.remove(HOST_INTER_FONT_CLASS);
        });

        expect(configuration).toMatchObject({ typography: BlueprintConfigurationOptions.typography.lato });
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

    test('should provide the container to portaled content that takes it as a prop', () => {
        const container = document.createElement('div');
        let portalContainer;
        const Consumer = (): null => {
            portalContainer = React.useContext(PortalContainerContext);
            return null;
        };

        render(
            <BlueprintProviders container={container}>
                <Consumer />
            </BlueprintProviders>,
        );

        expect(portalContainer).toBe(container);
    });
});
