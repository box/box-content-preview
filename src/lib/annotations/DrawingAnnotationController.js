import { PAGE_PADDING_TOP, PAGE_PADDING_BOTTOM } from './annotationConstants';
import * as annotatorUtil from './annotatorUtil';
import * as docAnnotatorUtil from './doc/docAnnotatorUtil';
import * as RTree from '../rbush.min';

const POINTER_DOWN = 0;
const POINTER_UP = 1;
const POINTER_ERASE = 2;

const RENDER_THRES = 16.67; // 60 FPS target
const RTREE_WIDTH = 5;

// Should extend annotation thread?
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
     * @return {DrawingAnnotationController} Drawing controller instance
     */
    constructor(annotatedElement) {
        this.drawingFlag = POINTER_UP;
        this.page = 0;
        this.annotatedEl = annotatedElement;
<<<<<<< HEAD
        this.pathContainer = new Rbush(RTREE_WIDTH);
=======
        this.pathContainer = new RTree(RTREE_WIDTH);
>>>>>>> Update: drawing annotation progress
        this.pointerPosition = null;
        this.canvasCache = {};
        // Insert metadata into this object
        this.pendingPath = new DrawingPath();
    }

    handleMove(location) {
        const pageEl = this.getPageEl(location.page);
        this.context = this.getCanvas(location.page, pageEl).getContext('2d');
        const [x, y] = docAnnotatorUtil.getBrowserCoordinatesFromLocation(location, pageEl);
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
<<<<<<< HEAD
        this.location = location; // using to pass commit check
=======
>>>>>>> Update: drawing annotation progress
        window.requestAnimationFrame(this.render.bind(this));
        this.drawingFlag = POINTER_DOWN;
        this.scale = this.annotatorUtil.getScale(this.annotatedEl);
    }

    handleStop(location) {
        this.drawingFlag = POINTER_UP;
        const pageEl = this.getPageEl(location.page);
        const canvas = this.getCanvas(location.page, pageEl);
        this.savedState = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        this.finalizePath();
    }

    /*
            const page = this.getPageEl(location.page);
            let annotationLayerEl = page.querySelector('.bp-annotation-layer');
            if (!annotationLayerEl) {
                annotationLayerEl = document.createElement('canvas');
                annotationLayerEl.classList.add('bp-annotation-layer');
                const pageDimensions = page.getBoundingClientRect();
                annotationLayerEl.width = pageDimensions.width;
                annotationLayerEl.height = pageDimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;

                const textLayerEl = page.querySelector('.textLayer');
                page.insertBefore(annotationLayerEl, textLayerEl);
            }
            const ctx = annotationLayerEl.getContext('2d');
            const scale = annotatorUtil.getScale(this.annotatedEl);
            const [x,y] = docAnnotatorUtil.convertPDFSpaceToDOMSpace([location.x, location.y], annotationLayerEl.height, scale);
    */
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
        this.pageEl = this.annotatedEl.querySelector(`[data-page-number="${pageNum}"]`);
        return this.pageEl;
    }
    render(timeElapsed) {
        if (this.drawingFlag === POINTER_DOWN) {
            const elapsed = timeElapsed - (this.timeElapsed || 0);
            if (elapsed >= RENDER_THRES) {
                this.timeElapsed = timeElapsed;
                const canvas = this.getCanvas(this.page, this.pageEl);
                const context = canvas.getContext('2d');
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
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 5 / this.scale;
        console.log(ctx.width);
        for (let i = 0; i < path.length; i++) {
            let xLast;
            let yLast;

            if (i > 0) {
                xLast = path[i - 1].x;
                yLast = path[i - 1].y;
            } else {
                xLast = path[i].x - 1;
                yLast = path[i].y;
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
