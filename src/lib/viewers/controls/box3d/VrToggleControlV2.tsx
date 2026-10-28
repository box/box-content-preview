import React from 'react';
import { IconButton, IconButtonProps, Toolbar, Tooltip } from '@box/blueprint-web';
import VrGoggles from '@box/blueprint-web-assets/icons/Medium/VrGoggles';
import { stopActivationKeyPropagation } from '../media/utils';
import { Props as BaseProps } from './VrToggleControl';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

// Toolbar.Button throws outside a Toolbar.Root, so surfaces without one (the media bar) use IconButton.
export type ToolbarProps = BaseProps & { buttonType?: 'toolbar' };
export type IconProps = BaseProps &
    DistributiveOmit<IconButtonProps, 'aria-label' | 'icon' | 'onClick'> & { buttonType: 'icon' };
export type Props = ToolbarProps | IconProps;

export default function VrToggleControlV2(props: Props): JSX.Element | null {
    if (!props.isVrShown) {
        return null;
    }

    if (props.buttonType === 'icon') {
        const { buttonType, isVrShown, onVrToggle, ...rest } = props;

        return (
            <Tooltip content={__('box3d_toggle_vr')}>
                <IconButton
                    data-target-id="VrToggleControlV2-toggle"
                    onKeyDown={stopActivationKeyPropagation}
                    {...rest}
                    aria-label={__('box3d_toggle_vr')}
                    data-resin-target="vrToggle"
                    icon={VrGoggles}
                    onClick={onVrToggle}
                />
            </Tooltip>
        );
    }

    return (
        <Tooltip content={__('box3d_toggle_vr')}>
            <Toolbar.Button aria-label={__('box3d_toggle_vr')} data-resin-target="vrToggle" onClick={props.onVrToggle}>
                <Toolbar.Icon icon={VrGoggles} />
            </Toolbar.Button>
        </Tooltip>
    );
}
