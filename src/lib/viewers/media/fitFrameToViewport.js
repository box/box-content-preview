import { MIN_VIDEO_WIDTH_PX } from '../../constants';

/**
 * Contain-fits a frame into the viewport (same model as object-fit: contain).
 *
 * @param {number} aspectRatio - width / height
 * @param {Object} viewport - { width, height }
 * @return {{ width: number, height: number }}
 */
export default function fitFrameToViewport(aspectRatio, viewport = {}) {
    const { width: viewportWidth = 0, height: viewportHeight = 0 } = viewport;
    const ratio = aspectRatio || 1;

    let width = Math.max(MIN_VIDEO_WIDTH_PX, viewportWidth);
    let height = width / ratio;

    if (height > viewportHeight) {
        height = viewportHeight;
        width = height * ratio;
    }

    if (width > viewportWidth) {
        width = viewportWidth;
        height = width / ratio;
    }

    if (width < MIN_VIDEO_WIDTH_PX) {
        width = MIN_VIDEO_WIDTH_PX;
        height = width / ratio;
    }

    return { width, height };
}
