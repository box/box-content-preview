// Trackpad pinch arrives as many small pixel deltas. A mouse notch arrives as
// one large pixel delta (Chrome reports about ±100) or as line/page mode (Firefox).
const DOM_DELTA_PIXEL = 0;
const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;
const PINCH_SCALE_FACTOR = 0.01;
const NOTCH_SCALE_STEP = 0.1;
const MOUSE_WHEEL_PIXEL_THRESHOLD = 50;

/**
 * Scale change for one ctrl+wheel event. Negative zooms out.
 * A mouse notch steps by the same 10% as the +/- buttons. A trackpad pinch
 * stays proportional to its small pixel delta.
 *
 * @param {Pick<WheelEvent, 'deltaY' | 'deltaMode'>} event - wheel event
 * @return {number} amount to add to the current scale
 */
export function getWheelZoomScaleDelta(event) {
    const { deltaY } = event;
    if (!deltaY) {
        return 0;
    }

    const deltaMode = event.deltaMode || DOM_DELTA_PIXEL;
    const isDiscreteWheel = deltaMode === DOM_DELTA_LINE || deltaMode === DOM_DELTA_PAGE;
    const isPixelNotch = deltaMode === DOM_DELTA_PIXEL && Math.abs(deltaY) >= MOUSE_WHEEL_PIXEL_THRESHOLD;

    if (isDiscreteWheel || isPixelNotch) {
        return -Math.sign(deltaY) * NOTCH_SCALE_STEP;
    }

    return -deltaY * PINCH_SCALE_FACTOR;
}
