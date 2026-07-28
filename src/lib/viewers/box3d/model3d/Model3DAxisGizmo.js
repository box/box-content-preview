import './Model3DAxisGizmo.scss';

// DEMO ONLY — a small "viewcube"-style axis gizmo pinned to the top-right of the 3D
// viewport. Clicking a colored axis ball orbits the CAMERA to look straight down that
// axis (positive = solid ball, negative = hollow ring), keeping the current pivot/zoom.
// Rotating the camera, not the model, matches DCC tools (Blender/Fusion).

const NS = 'http://www.w3.org/2000/svg';

// Axis colors match the classic RGB=XYZ convention shown in the reference.
const AXIS_COLORS = {
    x: '#e5484d',
    y: '#8ecb1c',
    z: '#3d7ff2',
};

// 2D projection offsets (unit-ish) for an isometric-ish view of the three axes.
// Origin is the gizmo center; y is negated because SVG y grows downward.
const AXIS_DIRS = {
    x: { dx: -0.72, dy: 0.5 },
    y: { dx: 0.86, dy: 0.16 },
    z: { dx: 0, dy: -0.95 },
};

class Model3DAxisGizmo {
    /**
     * @param {HTMLElement} containerEl - The viewer wrapper element to mount into.
     * @param {Model3DRenderer} renderer - The renderer used to snap the camera.
     */
    constructor(containerEl, renderer) {
        this.containerEl = containerEl;
        this.renderer = renderer;
        this.handleAxisClick = this.handleAxisClick.bind(this);

        this.mount();
    }

    mount() {
        const size = 84;
        const c = size / 2;
        const r = size * 0.34; // stalk length from center

        this.el = document.createElement('div');
        this.el.className = 'bp-m3d-gizmo';
        this.el.setAttribute('data-testid', 'bp-m3d-gizmo');

        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('width', String(size));
        svg.setAttribute('height', String(size));
        svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

        Object.keys(AXIS_DIRS).forEach(axis => {
            const { dx, dy } = AXIS_DIRS[axis];
            const px = c + dx * r;
            const py = c + dy * r;
            // Negative endpoint is opposite the positive one.
            const nx = c - dx * r;
            const ny = c - dy * r;
            const color = AXIS_COLORS[axis];

            // Stalk from center to the positive ball.
            const line = document.createElementNS(NS, 'line');
            line.setAttribute('x1', String(c));
            line.setAttribute('y1', String(c));
            line.setAttribute('x2', String(px));
            line.setAttribute('y2', String(py));
            line.setAttribute('stroke', color);
            line.setAttribute('stroke-width', '2');
            svg.appendChild(line);

            // Positive axis: solid, labeled ball.
            svg.appendChild(this.createBall(px, py, color, axis.toUpperCase(), axis, 1));
            // Negative axis: hollow ring, no label.
            svg.appendChild(this.createBall(nx, ny, color, '', axis, -1));
        });

        this.el.appendChild(svg);
        this.containerEl.appendChild(this.el);
    }

    /**
     * Build a clickable axis ball. Positive balls are filled with a label; negative
     * balls are hollow rings.
     */
    createBall(cx, cy, color, label, axis, sign) {
        const g = document.createElementNS(NS, 'g');
        g.setAttribute('class', 'bp-m3d-gizmo-ball');
        g.setAttribute('data-axis', axis);
        g.setAttribute('data-sign', String(sign));
        g.setAttribute('role', 'button');
        g.setAttribute('tabindex', '0');
        g.setAttribute('aria-label', `${sign < 0 ? '-' : ''}${axis.toUpperCase()} view`);

        const circle = document.createElementNS(NS, 'circle');
        circle.setAttribute('cx', String(cx));
        circle.setAttribute('cy', String(cy));
        circle.setAttribute('r', sign > 0 ? '9' : '6');
        circle.setAttribute('fill', sign > 0 ? color : 'rgba(20, 20, 20, .55)');
        circle.setAttribute('stroke', color);
        circle.setAttribute('stroke-width', sign > 0 ? '0' : '2');
        g.appendChild(circle);

        if (label) {
            const text = document.createElementNS(NS, 'text');
            text.setAttribute('x', String(cx));
            text.setAttribute('y', String(cy));
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'central');
            text.setAttribute('class', 'bp-m3d-gizmo-label');
            text.textContent = label;
            g.appendChild(text);
        }

        g.addEventListener('click', this.handleAxisClick);
        return g;
    }

    handleAxisClick(event) {
        const g = event.currentTarget;
        const axis = g.getAttribute('data-axis');
        const sign = Number(g.getAttribute('data-sign')) < 0 ? -1 : 1;
        this.renderer.snapCameraToAxis(axis, sign);
    }

    destroy() {
        if (this.el && this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }
        this.el = null;
    }
}

export default Model3DAxisGizmo;
