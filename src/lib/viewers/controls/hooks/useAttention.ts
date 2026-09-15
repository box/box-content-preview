import * as React from 'react';

export type handlers = {
    onBlur: (event: React.FocusEvent<HTMLElement>) => void;
    onFocus: () => void;
    onMouseOut: (event: React.MouseEvent<HTMLElement>) => void;
    onMouseOver: () => void;
};

export type isActive = boolean;

function isInside(event: { currentTarget: EventTarget; relatedTarget: EventTarget | null }): boolean {
    return (event.currentTarget as Node).contains(event.relatedTarget as Node | null);
}

export default function useAttention(): [isActive, handlers] {
    const [isFocused, setFocused] = React.useState(false);
    const [isHovered, setHovered] = React.useState(false);

    const handleBlur = (event: React.FocusEvent<HTMLElement>): void => {
        if (isInside(event)) {
            return;
        }
        setFocused(false);
    };
    const handleFocus = (): void => setFocused(true);
    const handleMouseOut = (event: React.MouseEvent<HTMLElement>): void => {
        if (isInside(event)) {
            return;
        }
        setHovered(false);
    };
    const handleMouseOver = (): void => setHovered(true);

    return [
        isFocused || isHovered,
        {
            onBlur: handleBlur,
            onFocus: handleFocus,
            onMouseOut: handleMouseOut,
            onMouseOver: handleMouseOver,
        },
    ];
}
