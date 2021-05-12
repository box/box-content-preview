import * as React from 'react';

export default function useClickOutside(element: React.RefObject<Element> | null, callback: () => void): void {
    React.useEffect(() => {
        const handleDocumentClick = ({ target }: MouseEvent): void => {
            if (element && element.current && element.current.contains(target as Node)) {
                return;
            }

            callback();
        };

        document.addEventListener('click', handleDocumentClick);

        return (): void => {
            document.removeEventListener('click', handleDocumentClick);
        };
    }, [callback, element]);
}
