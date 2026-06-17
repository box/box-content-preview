import React from 'react';
import IconGridView24 from '../icons/IconGridView24';
import './GalleryToggle.scss';

export type Props = {
    isGalleryOpen?: boolean;
    onGalleryToggle?: () => void;
};

export default function GalleryToggle({ onGalleryToggle, isGalleryOpen }: Props): JSX.Element | null {
    if (!onGalleryToggle) {
        return null;
    }

    return (
        <button
            aria-pressed={isGalleryOpen}
            className={`bp-GalleryToggle${isGalleryOpen ? ' bp-is-active' : ''}`}
            data-resin-target="galleryView"
            onClick={onGalleryToggle}
            title={__('gallery_view')}
            type="button"
        >
            <IconGridView24 />
        </button>
    );
}
