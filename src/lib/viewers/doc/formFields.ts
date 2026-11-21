const BORDERED_FIELD_CONTAINER_SELECTOR =
    '.annotationLayer :is(.textWidgetAnnotation, .choiceWidgetAnnotation):not(.hasOwnCanvas)';
const DEFAULT_FIELD_BORDER_WIDTH = 'calc(1px * var(--total-scale-factor))';
const SCROLLING_OVERFLOW_VALUES = ['auto', 'scroll'];
const TOGGLE_INPUT_TYPES = ['checkbox', 'radio'];
const WHEEL_LINE_HEIGHT_PX = 16;

export const FORM_FIELD_COPY_EVENTS = ['copy', 'cut', 'dragstart'];

export const FORM_FIELD_SELECTOR = '.annotationLayer :is(input, select, textarea)';

export const SCROLLABLE_FORM_FIELD_SELECTOR = '.annotationLayer :is(textarea, input[type="text"], select[size])';

export type FormField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** Shape of pdf.js `PDFDocumentProxy.getFieldObjects()`, keyed by field name; `strokeColor` is RGB in 0-255 */
export type FieldObjects = ReadonlyMap<string, ReadonlyArray<{ id: string; strokeColor?: Uint8ClampedArray | null }>>;

export type ScrollAxis = 'x' | 'y';

export type WheelDelta = Pick<WheelEvent, 'deltaMode' | 'deltaX' | 'deltaY'>;

export const preventFormFieldDefault = (event: Event): void => {
    const { target } = event;
    const targetEl = target instanceof Text ? target.parentElement : target;

    if (targetEl instanceof Element && targetEl.closest('.annotationLayer')) {
        event.preventDefault();
    }
};

export const isPointInRect = (
    x: number,
    y: number,
    { bottom, left, right, top }: Pick<DOMRectReadOnly, 'bottom' | 'left' | 'right' | 'top'>,
): boolean => x >= left && x <= right && y >= top && y <= bottom;

export const getWheelDeltaPx = (
    { deltaMode, deltaX, deltaY }: WheelDelta,
    field: Element,
): Pick<WheelDelta, 'deltaX' | 'deltaY'> => {
    if (deltaMode === WheelEvent.DOM_DELTA_LINE) {
        return { deltaX: deltaX * WHEEL_LINE_HEIGHT_PX, deltaY: deltaY * WHEEL_LINE_HEIGHT_PX };
    }
    if (deltaMode === WheelEvent.DOM_DELTA_PAGE) {
        return { deltaX: deltaX * field.clientWidth, deltaY: deltaY * field.clientHeight };
    }
    return { deltaX, deltaY };
};

export const canScrollAlong = (field: Element, axis: ScrollAxis, delta: number): boolean => {
    const isVertical = axis === 'y';
    const { overflowX, overflowY } = getComputedStyle(field);
    const scrollOffset = isVertical ? field.scrollTop : field.scrollLeft;
    const visibleSize = isVertical ? field.clientHeight : field.clientWidth;
    const contentSize = isVertical ? field.scrollHeight : field.scrollWidth;

    if ((isVertical ? overflowY : overflowX) === 'hidden') {
        return false;
    }
    return (delta > 0 && scrollOffset + visibleSize < contentSize) || (delta < 0 && scrollOffset > 0);
};

export const isWithinScrollableElement = (
    element: Element | null,
    boundaryEl: Element,
    axis: ScrollAxis,
    delta: number,
): boolean => {
    for (let currentEl = element; currentEl && currentEl !== boundaryEl; currentEl = currentEl.parentElement) {
        const overflow = getComputedStyle(currentEl)[axis === 'y' ? 'overflowY' : 'overflowX'];
        if (SCROLLING_OVERFLOW_VALUES.includes(overflow) && canScrollAlong(currentEl, axis, delta)) {
            return true;
        }
    }
    return false;
};

/**
 * Draws each field's PDF border color around its HTML control. pdf.js draws a border only for a nonzero
 * /BS or /Border width, which many PDFs leave at 0 while their painted appearance still has one.
 */
export const applyFieldBorders = (layerEl: Element, fieldObjects?: FieldObjects | null): void => {
    const borderColors = new Map(
        Array.from(fieldObjects?.values() ?? []).flatMap(widgets =>
            widgets.flatMap(
                ({ id, strokeColor }): Array<[string, string]> =>
                    strokeColor?.length === 3 ? [[id, `rgb(${strokeColor.join(', ')})`]] : [],
            ),
        ),
    );

    layerEl.querySelectorAll<HTMLElement>(BORDERED_FIELD_CONTAINER_SELECTOR).forEach(container => {
        const borderColor = borderColors.get(container.dataset.annotationId ?? '');
        if (borderColor && !container.style.borderWidth) {
            Object.assign(container.style, {
                borderColor,
                borderStyle: 'solid',
                borderWidth: DEFAULT_FIELD_BORDER_WIDTH,
            });
        }
    });
};

export const lockFormField = (field: FormField): void => {
    if (field instanceof HTMLSelectElement || TOGGLE_INPUT_TYPES.includes(field.type)) {
        field.disabled = true;
        return;
    }

    // Keeps PDF read-only fields scrollable, since Chromium and WebKit do not wheel-scroll disabled textareas
    field.disabled = false;
    field.readOnly = true;
};
