import React from 'react';
import { DropdownMenu, Text, Toolbar, ToolbarButtonProps } from '@box/blueprint-web';
import { Video } from '@box/blueprint-web-assets/icons/Medium';
import MenuTriggerTooltipV2 from '../tooltip/MenuTriggerTooltipV2';
import { formatDuration, Props } from './AnimationClipsControl';
import { PortalContainerContext } from '../../../BlueprintProviders';

const settingsRadioItemAction = {
    action: 'programmatic',
    component: 'toolbar',
    target: 'settingsRadioItem',
} as const;

// The Tooltip sits inside the DropdownMenu trigger so the trigger keeps the menu's data-state.
function AnimationClipsToggle(props: ToolbarButtonProps, ref: React.Ref<HTMLButtonElement>): JSX.Element {
    const isMenuOpen = props['aria-expanded'] === true || props['aria-expanded'] === 'true';

    return (
        <MenuTriggerTooltipV2 content={__('box3d_animation_clips')} isMenuOpen={isMenuOpen}>
            <Toolbar.Button
                ref={ref}
                aria-label={__('box3d_animation_clips')}
                data-resin-target="animationClips"
                {...props}
            >
                <Toolbar.Icon icon={Video} />
            </Toolbar.Button>
        </MenuTriggerTooltipV2>
    );
}

const AnimationClipsToggleV2 = React.forwardRef(AnimationClipsToggle);

export default function AnimationClipsControlV2({
    animationClips,
    currentAnimationClipId,
    onAnimationClipSelect,
}: Props): JSX.Element {
    const container = React.useContext(PortalContainerContext);
    // Props types this as () => void, but the viewer's handler reads the selected clip id.
    const onSelect: (id: string) => void = onAnimationClipSelect;

    const handleValueChange = (id: string): void => {
        window.Box?.Preview?.resin?.recordAction?.(settingsRadioItemAction);
        onSelect(id);
    };

    return (
        <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger asChild>
                <AnimationClipsToggleV2 />
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="start" container={container} side="top">
                <DropdownMenu.RadioGroup onValueChange={handleValueChange} value={currentAnimationClipId}>
                    {animationClips.map(({ duration, id, name }) => (
                        <DropdownMenu.RadioSelectItem key={id} data-resin-target="settingsRadioItem" value={id}>
                            <Text as="span">{`${formatDuration(duration)} ${name}`}</Text>
                        </DropdownMenu.RadioSelectItem>
                    ))}
                </DropdownMenu.RadioGroup>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
}
