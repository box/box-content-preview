import React from 'react';

export type ScrubPreviewProps = {
    onScrub?: (time: number) => void;
    onScrubEnd?: (time: number) => void;
    onScrubStart?: () => void;
};

type Options = ScrubPreviewProps & {
    onTimeChange: (time: number) => void;
};

type ScrubPreview = {
    handleScrubEnd?: () => void;
    handleScrubStart?: () => void;
    handleUpdate: (time: number) => void;
    isScrubbing: boolean;
};

/**
 * When the host passes onScrub, drag updates go to onScrub instead of onTimeChange, and onScrubEnd
 * receives the release time. Without onScrub every update goes to onTimeChange.
 */
export default function useScrubPreview({ onScrub, onScrubEnd, onScrubStart, onTimeChange }: Options): ScrubPreview {
    const [isScrubbing, setIsScrubbing] = React.useState(false);
    const isScrubbingRef = React.useRef(false);
    const scrubTimeRef = React.useRef(0);

    const handleScrubStart = React.useCallback((): void => {
        if (isScrubbingRef.current) return;

        isScrubbingRef.current = true;
        setIsScrubbing(true);
        onScrubStart?.();
    }, [onScrubStart]);

    const handleScrubEnd = React.useCallback((): void => {
        if (!isScrubbingRef.current) return;

        isScrubbingRef.current = false;
        setIsScrubbing(false);
        onScrubEnd?.(scrubTimeRef.current);
    }, [onScrubEnd]);

    const handleUpdate = React.useCallback(
        (time: number): void => {
            if (onScrub && isScrubbingRef.current) {
                scrubTimeRef.current = time;
                onScrub(time);
                return;
            }

            onTimeChange(time);
        },
        [onScrub, onTimeChange],
    );

    return onScrub
        ? { handleScrubEnd, handleScrubStart, handleUpdate, isScrubbing }
        : { handleUpdate: onTimeChange, isScrubbing };
}
