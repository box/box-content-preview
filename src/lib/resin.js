/**
 * Host-supplied Resin logger for gestures that never produce a click
 * (scrub, pinch). Click autolog still owns tagged buttons/links.
 */

let resinLogger = null;

export function setPreviewResin(next) {
    resinLogger = next && typeof next.recordAction === 'function' ? next : null;
}

export function recordProgrammaticResin({ component, feature, fileExtension, fileId, target } = {}) {
    if (!resinLogger || !target) {
        return;
    }

    const attributes = {
        action: 'programmatic',
        target,
    };

    if (component) {
        attributes.component = component;
    }

    if (feature) {
        attributes.feature = feature;
    }

    if (fileId) {
        attributes.fileId = fileId;
    }

    if (fileExtension) {
        attributes.fileExtension = fileExtension;
    }

    resinLogger.recordAction(attributes);
}

export function recordScrubResin(el, fallbackTarget) {
    if (!el) {
        return;
    }

    const targetEl = el.hasAttribute?.('data-resin-target') ? el : el.closest?.('[data-resin-target]');
    const target = fallbackTarget || targetEl?.getAttribute('data-resin-target');
    if (!target) {
        return;
    }

    const toolbar = el.closest?.('[data-resin-component]');

    recordProgrammaticResin({
        component: toolbar?.getAttribute('data-resin-component') || 'toolbar',
        feature: el.closest?.('[data-resin-feature]')?.getAttribute('data-resin-feature') || undefined,
        fileExtension: toolbar?.getAttribute('data-resin-fileextension') || undefined,
        fileId: toolbar?.getAttribute('data-resin-fileid') || undefined,
        target,
    });
}
