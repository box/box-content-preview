import * as React from 'react';
import { decodeKeydown } from '../../../util';

export default function usePreventKey(ref: React.RefObject<HTMLElement | null>, keys: string[] = []): void {
    React.useEffect(() => {
        const { current: element } = ref;

        const handleKeydown = (event: KeyboardEvent): void => {
            const key = decodeKeydown(event);

            if (keys.includes(key)) {
                event.stopPropagation(); // Prevents global key handling. Can be simplified with React v17.
            }
        };

        if (element) {
            element.addEventListener('keydown', handleKeydown);
        }

        return (): void => {
            if (element) {
                element.removeEventListener('keydown', handleKeydown);
            }
        };
    }, [keys, ref]);
}
