/**
 * Host-supplied Resin logger for gestures that never produce a click (scrub, pinch).
 * Click autolog still owns tagged buttons/links.
 */

let resinLogger = null;

export function setPreviewResin(next) {
    resinLogger = next && typeof next.recordAction === 'function' ? next : null;
}

export function recordProgrammaticResin(target, component = 'toolbar') {
    if (!resinLogger || !target) {
        return;
    }

    resinLogger.recordAction({
        action: 'programmatic',
        component,
        target,
    });
}
