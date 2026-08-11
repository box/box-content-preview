/**
 * Contain-fits a frame into the viewport (same model as object-fit: contain).
 * Never exceeds the viewport; does not enforce a minimum width.
 *
 * @param {number} aspectRatio - width / height
 * @param {Object} viewport - { width, height }
 * @return {{ width: number, height: number }}
 */
export default function fitFrameToViewport(aspectRatio, viewport = {}) {
    const { width: viewportWidth = 0, height: viewportHeight = 0 } = viewport;
    const ratio = aspectRatio || 1;

    if (viewportWidth <= 0 || viewportHeight <= 0) {
        return { width: 0, height: 0 };
    }

    let width = viewportWidth;
    let height = width / ratio;

    if (height > viewportHeight) {
        height = viewportHeight;
        width = height * ratio;
    }

    if (width > viewportWidth) {
        width = viewportWidth;
        height = width / ratio;
    }

    return { width, height };
}
