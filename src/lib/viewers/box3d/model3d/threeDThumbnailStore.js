/**
 * threeDThumbnailStore
 *
 * DEMO / SPIKE ONLY.
 *
 * A tiny localStorage-backed cache for a still image of a 3D model, captured
 * the first time a user opens the file in Preview. Because Preview runs as a
 * federated remote on the SAME browser origin as EndUserApp, both apps share
 * localStorage — so EUA can read back a thumbnail this module writes here and
 * render it in the folder grid / list-hover, where the backend does not (yet)
 * generate a real image representation for 3D file types.
 *
 * This is a client-side stand-in for a server-generated JPG representation.
 * It only ever produces a thumbnail for files the current user has already
 * opened in this browser; it is not a substitute for the backend feature.
 */

const KEY_PREFIX = 'box-preview-3d-thumb:';

// Keep entries small so we don't blow the ~5MB localStorage budget.
const MAX_DIMENSION = 512;
const JPEG_QUALITY = 0.82;

/**
 * Build the localStorage key for a file id.
 *
 * @param {string} fileId - Box file id
 * @return {string} Namespaced storage key
 */
export function getStorageKey(fileId) {
    return `${KEY_PREFIX}${fileId}`;
}

/**
 * Downscale a source canvas into a JPEG data URL no larger than MAX_DIMENSION
 * on its longest edge, preserving aspect ratio.
 *
 * @param {HTMLCanvasElement} sourceCanvas - The live WebGL canvas
 * @return {string} A `data:image/jpeg;base64,...` URL
 */
function toScaledDataUrl(sourceCanvas) {
    const { width, height } = sourceCanvas;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const offscreen = document.createElement('canvas');
    offscreen.width = targetWidth;
    offscreen.height = targetHeight;

    const ctx = offscreen.getContext('2d');
    // Paint a white backdrop first — the WebGL canvas is alpha:true, so
    // transparent pixels would otherwise turn black when flattened to JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

    return offscreen.toDataURL('image/jpeg', JPEG_QUALITY);
}

/**
 * Capture the current frame of the 3D canvas and persist it for `fileId`.
 * Safe to call repeatedly; failures are swallowed (this is a best-effort hack).
 *
 * @param {string} fileId - Box file id
 * @param {HTMLCanvasElement} canvas - The Box3D WebGL canvas (preserveDrawingBuffer is true)
 * @return {boolean} Whether a thumbnail was stored
 */
export function saveThumbnail(fileId, canvas) {
    if (!fileId || !canvas || !canvas.width || !canvas.height) {
        return false;
    }

    try {
        const dataUrl = toScaledDataUrl(canvas);
        window.localStorage.setItem(getStorageKey(fileId), dataUrl);
        return true;
    } catch (e) {
        // Quota exceeded, tainted canvas, private-mode, etc. — non-fatal for a spike.
        return false;
    }
}
