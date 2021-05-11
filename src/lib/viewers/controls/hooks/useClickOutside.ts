import * as React from 'react';

export default function useClickOutside(element: HTMLelement | null, callback: () => void): void {
    React.useEffect(() => {
        const handleDocumentClick = ({ target }: MouseEvent): void => {
            if (element && element.contains(target as Node)) {
                return;
            }

            callback();
        };

        document.addEventListener('click', handleDocumentClick);

        return (): void => {
            document.removeEventListener('click', handleDocumentClick);
        };
    }, [element, callback]);
}
