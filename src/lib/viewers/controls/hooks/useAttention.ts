import * as React from 'react';

export type handlers = {
    onBlur: () => void;
    onFocus: () => void;
    onMouseOut: () => void;
    onMouseOver: () => void;
};

export type isActive = boolean;

export default function useAttention(): [isActive, handlers] {
    const [isFocused, setFocused] = React.useState(false);
    const [isHovered, setHovered] = React.useState(false);

    const handleBlur = (): void => setFocused(false);
    const handleFocus = (): void => setFocused(true);
    const handleMouseOut = (): void => setHovered(false);
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
