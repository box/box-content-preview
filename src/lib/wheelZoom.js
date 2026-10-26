// Trackpad pinch arrives as many small pixel deltas. A mouse notch arrives as
// one large pixel delta (Chrome reports about ±100) or as line/page mode (Firefox).
const DOM_DELTA_PIXEL = 0;
const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;
const PINCH_SCALE_FACTOR = 0.01;
const NOTCH_SCALE_STEP = 0.1;

/**
 * Scale change for one ctrl+wheel event. Negative zooms out.
 * Line and page mode are one notch per event. Pixel mode stays proportional
 * to deltaY and is capped at one 10% step, matching the +/- buttons.
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
    if (deltaMode === DOM_DELTA_LINE || deltaMode === DOM_DELTA_PAGE) {
        return -Math.sign(deltaY) * NOTCH_SCALE_STEP;
    }

    const proportional = -deltaY * PINCH_SCALE_FACTOR;
    const magnitude = Math.min(Math.abs(proportional), NOTCH_SCALE_STEP);
    return Math.sign(proportional) * magnitude;
}
