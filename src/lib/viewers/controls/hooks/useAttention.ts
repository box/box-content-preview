import * as React from 'react';

export type AttentionHandlers = {
    onBlur: React.FocusEventHandler;
    onFocus: React.FocusEventHandler;
    onMouseOut: React.MouseEventHandler;
    onMouseOver: React.MouseEventHandler;
};

export type isActive = boolean;

export default function useAttention({ onBlur, onFocus, onMouseOut, onMouseOver }: Partial<AttentionHandlers> = {}): [
    isActive,
    AttentionHandlers,
] {
    const [isFocused, setFocused] = React.useState(false);
    const [isHovered, setHovered] = React.useState(false);

    const handleBlur = (event: React.FocusEvent): void => {
        if (onBlur) {
            onBlur(event);
        }

        setFocused(false);
    };
    const handleFocus = (event: React.FocusEvent): void => {
        if (onFocus) {
            onFocus(event);
        }

        setFocused(true);
    };
    const handleMouseOut = (event: React.MouseEvent): void => {
        if (onMouseOut) {
            onMouseOut(event);
        }

        setHovered(false);
    };
    const handleMouseOver = (event: React.MouseEvent): void => {
        if (onMouseOver) {
            onMouseOver(event);
        }

        setHovered(true);
    };

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
