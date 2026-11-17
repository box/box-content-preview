import React from 'react';

const getMatches = (query: string): boolean =>
    typeof window.matchMedia === 'function' && window.matchMedia(query).matches;

export default function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = React.useState(() => getMatches(query));

    React.useEffect(() => {
        if (typeof window.matchMedia !== 'function') {
            return undefined;
        }

        const mediaQueryList = window.matchMedia(query);
        const handleChange = (): void => setMatches(mediaQueryList.matches);

        handleChange();
        mediaQueryList.addEventListener('change', handleChange);

        return (): void => mediaQueryList.removeEventListener('change', handleChange);
    }, [query]);

    return matches;
}
