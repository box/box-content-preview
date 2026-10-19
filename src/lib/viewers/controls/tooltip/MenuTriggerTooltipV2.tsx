import React from 'react';
import { Tooltip } from '@box/blueprint-web';

export type Props = {
    children: React.ReactNode;
    content: React.ReactNode;
    isMenuOpen: boolean;
};

// An open tooltip sits above the menu in the dismiss stack, so it would cover the menu and take its first Escape.
export default function MenuTriggerTooltipV2({ children, content, isMenuOpen }: Props): JSX.Element {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <Tooltip content={content} onOpenChange={setIsOpen} open={isOpen && !isMenuOpen}>
            {children}
        </Tooltip>
    );
}
