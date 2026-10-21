import React from 'react';
import { DropdownMenu, Toolbar, ToolbarButtonProps } from '@box/blueprint-web';
import EllipsisVertical from '@box/blueprint-web-assets/icons/Medium/EllipsisVertical';
import ControlsLayerContext from '../controls-layer/ControlsLayerContext';
import MenuTriggerTooltipV2 from '../tooltip/MenuTriggerTooltipV2';
import { ControlsBarItem } from './useControlsOverflow';
import { PortalContainerContext } from '../../../BlueprintProviders';
import { stopEscapePropagation, stopKeyPropagation } from '../settings/stopMenuKeyPropagation';
import './ControlsOverflowMenuV2.scss';

export type Props = {
    items: ControlsBarItem[];
};

// Handlers that return focus to the control that invoked them get the trigger, since the row unmounts with the menu
export const ControlsOverflowTriggerContext = React.createContext<React.RefObject<HTMLButtonElement>>({
    current: null,
});

// The menu portals out of the controls root, so it carries the root's Resin attributes itself
const getResinAttributes = (element: HTMLElement | null): Record<string, string> => {
    const resinComponent = element?.closest('[data-resin-component]');

    return resinComponent
        ? Object.fromEntries(
              Array.from(resinComponent.attributes)
                  .filter(({ name }) => name.startsWith('data-resin-'))
                  .map(({ name, value }) => [name, value]),
          )
        : {};
};

function ControlsOverflowToggle(props: ToolbarButtonProps, ref: React.Ref<HTMLButtonElement>): JSX.Element {
    const isMenuOpen = props['aria-expanded'] === true || props['aria-expanded'] === 'true';

    return (
        <MenuTriggerTooltipV2 content={__('controls_more')} isMenuOpen={isMenuOpen}>
            <Toolbar.Button
                ref={ref}
                aria-label={__('controls_more')}
                data-resin-target="moreOptions"
                data-testid="bp-ControlsBar-overflowBtn"
                {...props}
            >
                <Toolbar.Icon icon={EllipsisVertical} />
            </Toolbar.Button>
        </MenuTriggerTooltipV2>
    );
}

const ControlsOverflowToggleV2 = React.forwardRef(ControlsOverflowToggle);

export default function ControlsOverflowMenuV2({ items }: Props): JSX.Element {
    const container = React.useContext(PortalContainerContext) ?? undefined;
    const { setIsForced } = React.useContext(ControlsLayerContext);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const [isOpen, setIsOpen] = React.useState(false);
    const [resinAttributes, setResinAttributes] = React.useState<Record<string, string>>({});

    const handleOpenChange = (open: boolean): void => {
        if (open) {
            setResinAttributes(getResinAttributes(triggerRef.current));
        }

        setIsOpen(open);
    };

    // The menu sits outside the controls layer, which would otherwise hide the bar under the open menu
    React.useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        setIsForced(true);

        return (): void => setIsForced(false);
    }, [isOpen, setIsForced]);

    return (
        <DropdownMenu.Root modal={false} onOpenChange={handleOpenChange} open={isOpen}>
            <DropdownMenu.Trigger
                ref={triggerRef}
                asChild
                data-overflow-ids={items.map(({ id }) => id).join(' ')}
                data-overflow-trigger=""
            >
                <ControlsOverflowToggleV2 />
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
                align="end"
                className="bp-ControlsOverflowMenuV2"
                container={container}
                data-testid="bp-ControlsBar-overflowMenu"
                onEscapeKeyDown={stopEscapePropagation}
                onKeyDown={stopKeyPropagation}
                side="top"
                {...resinAttributes}
            >
                <ControlsOverflowTriggerContext.Provider value={triggerRef}>
                    {items.map(({ id, menu }) => (
                        <React.Fragment key={id}>{menu}</React.Fragment>
                    ))}
                </ControlsOverflowTriggerContext.Provider>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
}
