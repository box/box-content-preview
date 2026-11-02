import { useEffect, useState } from 'react';

// EndUserApp adds this to document.body when box_inter_font is on, and loads Inter Variable.
export const HOST_INTER_FONT_CLASS = 'is-inter-font';

// Preview has no Split client. Blueprint Text stays on Lato until this class is present.
export default function useHostInterFont(): boolean {
    const [isInterFont, setIsInterFont] = useState(() => document.body.classList.contains(HOST_INTER_FONT_CLASS));

    useEffect(() => {
        const update = (): void => {
            setIsInterFont(document.body.classList.contains(HOST_INTER_FONT_CLASS));
        };

        update();

        const observer = new MutationObserver(update);
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, []);

    return isInterFont;
}
