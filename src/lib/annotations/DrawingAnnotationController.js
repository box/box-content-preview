/* global Rbush */
import { PAGE_PADDING_TOP, PAGE_PADDING_BOTTOM } from './annotationConstants';
import * as DocAnnotatorUtil from './doc/DocAnnotatorUtil';
import * as AnnotatorUtil from './AnnotatorUtil';

const POINTER_DOWN = 0;
const POINTER_UP = 1;
// const POINTER_ERASE = 2;

const RENDER_THRESHOLD = 16.67; // 60 FPS target. 16.667ms/frame
const RTREE_WIDTH = 5;

class DrawingPath {
    constructor(metadata) {
        this.path = [];
        this.minX = undefined;
        this.minY = undefined;
        this.maxX = undefined;
        this.maxY = undefined;

        if (metadata) {
            this.metadata = metadata;
        }
    }

    addCoordinate(xPos, yPos) {
        if (this.minX === undefined || xPos < this.minX) {
            this.minX = xPos;
        }
        if (this.maxX === undefined || xPos < this.maxX) {
            this.maxX = xPos;
        }
        if (this.minY === undefined || yPos < this.minY) {
            this.minY = yPos;
        }
        if (this.maxY === undefined || yPos < this.maxY) {
            this.maxY = yPos;
        }
        this.path.push({
            x: xPos,
            y: yPos
        });
    }

    isEmpty() {
        return this.path.length === 0 && !this.metadata;
    }
}
class DrawingAnnotation {
    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     *
     * @param {Object} annotatedElement DOM Object to be annotated
     * @return {DrawingAnnotationController} Drawing controller instance
     */
    constructor(annotatedElement) {
        this.drawingFlag = POINTER_UP;
        this.page = 0;
        this.annotatedEl = annotatedElement;
        this.pathContainer = new Rbush(RTREE_WIDTH);
        this.pointerPosition = null;
        // Insert metadata into this object
        this.pendingPath = new DrawingPath();
    }

    handleMove(location) {
        const pageEl = this.getPageEl(location.page);
        if (this.pageEl && pageEl !== this.pageEl) {
            this.handleStop(location);
            this.pageEl = pageEl;
            return;
        }
        this.pageEl = pageEl;
        const [x, y] = DocAnnotatorUtil.getBrowserCoordinatesFromLocation(location, pageEl);
        this.pointerPosition = {
            x,
            y,
            page: location.page
        };

        if (this.drawingFlag === POINTER_DOWN) {
            this.addToPath(x, y);
        }
        /*
        else if(this.drawingFlag === POINTER_ERASE) {

        }
        */
    }

    handleStart(location) {
        this.location = location; // using to pass commit check
        window.requestAnimationFrame(this.render.bind(this));
        this.drawingFlag = POINTER_DOWN;
        this.scale = 2.77;
    }

    handleStop(location) {
        this.drawingFlag = POINTER_UP;
        const pageEl = this.getPageEl(location.page);
        const canvas = this.getCanvas(location.page, pageEl);
        this.savedState = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        this.finalizePath();
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    finalizePath() {
        if (!this.pendingPath.isEmpty()) {
            this.pathContainer.insert(this.pendingPath);
            this.pendingPath = new DrawingPath();
        }
    }
    addToPath(x, y) {
        this.pendingPath.addCoordinate(x, y);
    }
    getPageEl(pageNum) {
        return this.annotatedEl.querySelector(`[data-page-number="${pageNum}"]`);
    }
    render(timeElapsed) {
        if (this.drawingFlag === POINTER_DOWN) {
            const elapsed = timeElapsed - (this.timeElapsed || 0);
            if (elapsed >= RENDER_THRES) {
                this.timeElapsed = timeElapsed;
                const context = this.context;
                if (this.savedState) {
                    context.putImageData(this.savedState, 0, 0);
                }
                const coords = this.pendingPath.path;
                context.beginPath();
                this.plotPath(coords, context);
                context.stroke();
            }
            window.requestAnimationFrame(this.render.bind(this));
        }
    }
    plotPath(path, context) {
        const ctx = context;
<<<<<<< HEAD
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3 * this.scale;
=======
>>>>>>> Update: do not get canvas on render
        for (let i = 0; i < path.length; i++) {
            let xLast;
            let yLast;

            if (i > 0) {
                xLast = path[i - 1].x;
                yLast = path[i - 1].y;
            } else {
                xLast = path[i].x - 1;
                yLast = path[i].y;
                ctx.moveTo(xLast, yLast);
            }

            const xMid = (path[i].x + xLast) / 2;
            const yMid = (path[i].y + yLast) / 2;
            ctx.quadraticCurveTo(xLast, yLast, xMid, yMid);
        }
    }

    getCanvas(pageNum, pageEl) {
        let annotationLayerEl = pageEl.querySelector('.bp-drawing-annotation-layer');
        if (!annotationLayerEl) {
            annotationLayerEl = document.createElement('canvas');
            annotationLayerEl.style.background = 'transparent';
            annotationLayerEl.classList.add('bp-drawing-annotation-layer');

            const pageDimensions = pageEl.getBoundingClientRect();
            annotationLayerEl.width = pageDimensions.width;
            annotationLayerEl.height = pageDimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;

            const textLayerEl = pageEl.querySelector('.textLayer');
            const context = annotationLayerEl.getContext('2d');
            pageEl.insertBefore(annotationLayerEl, textLayerEl);
            this.savedState = context.getImageData(0, 0, annotationLayerEl.width, annotationLayerEl.height);
        }
        return annotationLayerEl;
    }
}

export default DrawingAnnotation;
