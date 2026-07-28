import './Model3DWatermark.scss';

// DEMO ONLY — forensic watermark overlay for 3D model viewer.
// Renders a tiled, low-opacity, blend-mode diagonal watermark (user / date /
// file id) on a DOM layer ABOVE the WebGL canvas but BELOW the annotations
// pins layer. Because it is a DOM overlay rather than a scene background it
// never rotates/zooms with the camera and cannot be orbited off-screen.

const DEMO_USER = { name: 'Ed Wang' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format a Date as "12-Jun-2025" to match the reference watermark styling.
 *
 * @param {Date} date - Date to format
 * @return {string} Formatted date string
 */
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}-${MONTHS[date.getMonth()]}-${date.getFullYear()}`;
}

class Model3DWatermark {
    /** @property {HTMLElement} - Container the watermark layer is appended to */
    containerEl;

    /** @property {HTMLElement} - The watermark overlay element */
    watermarkEl;

    /**
     * @param {Object} config - Configuration
     * @param {HTMLElement} config.containerEl - Element to append the overlay to (viewer wrapper)
     * @param {string} config.fileId - File id shown in the watermark
     * @param {string} [config.userName] - Name of the current user
     * @param {Date} [config.date] - Date shown in the watermark (defaults to now)
     */
    constructor({ containerEl, fileId, userName = DEMO_USER.name, date = new Date() }) {
        this.containerEl = containerEl;
        this.fileId = fileId;
        this.userName = userName;
        this.date = date;
    }

    /**
     * Build and attach the watermark overlay.
     *
     * @return {void}
     */
    init() {
        this.watermarkEl = document.createElement('div');
        this.watermarkEl.className = 'bp-m3d-watermark';
        this.watermarkEl.style.backgroundImage = `url("${this.buildTile()}")`;
        this.containerEl.appendChild(this.watermarkEl);
    }

    /**
     * Show or hide the watermark overlay.
     *
     * @param {boolean} visible - Whether the watermark should be shown
     * @return {void}
     */
    setVisible(visible) {
        if (this.watermarkEl) {
            this.watermarkEl.classList.toggle('bp-is-hidden', !visible);
        }
    }

    /**
     * Remove the watermark overlay.
     *
     * @return {void}
     */
    destroy() {
        if (this.watermarkEl && this.watermarkEl.parentNode) {
            this.watermarkEl.parentNode.removeChild(this.watermarkEl);
        }
        this.watermarkEl = null;
    }

    /**
     * Build a single repeating tile as an inline SVG data URI. Each tile holds
     * three diagonal lines: file id, user name, and date.
     *
     * @return {string} data:image/svg+xml URI for use as a CSS background-image
     */
    buildTile() {
        const line1 = String(this.fileId || '');
        const line2 = this.userName;
        const line3 = formatDate(this.date);

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">
            <g transform="rotate(-30 110 110)" font-family="Lato, Helvetica, Arial, sans-serif" fill="#7f7f7f" text-anchor="middle">
                <text x="110" y="102" font-size="13">${line1}</text>
                <text x="110" y="121" font-size="15" font-weight="bold">${line2}</text>
                <text x="110" y="140" font-size="12">${line3}</text>
            </g>
        </svg>`;

        return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    }
}

export default Model3DWatermark;
