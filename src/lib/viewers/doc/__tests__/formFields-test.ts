import {
    applyFieldBorders,
    canScrollAlong,
    getWheelDeltaPx,
    isPointInRect,
    isWithinScrollableElement,
    lockFormField,
    preventFormFieldDefault,
} from '../formFields';

const setElementSizes = (field: HTMLElement, sizes: Record<string, number>): void => {
    Object.entries(sizes).forEach(([property, value]) => {
        Object.defineProperty(field, property, { configurable: true, value });
    });
};

describe('formFields', () => {
    describe('preventFormFieldDefault()', () => {
        const dispatchCancelableEvent = (target: Node): Event => {
            const event = new Event('dragstart', { bubbles: true, cancelable: true });
            target.dispatchEvent(event);
            return event;
        };

        beforeEach(() => {
            document.body.addEventListener('dragstart', preventFormFieldDefault);
        });

        afterEach(() => {
            document.body.removeEventListener('dragstart', preventFormFieldDefault);
            document.body.innerHTML = '';
        });

        test('should prevent events from elements inside the annotation layer', () => {
            document.body.innerHTML = '<div class="annotationLayer"><textarea></textarea></div>';

            expect(dispatchCancelableEvent(document.querySelector('textarea') as Node).defaultPrevented).toBe(true);
        });

        test('should prevent events from text nodes inside the annotation layer', () => {
            document.body.innerHTML = '<div class="annotationLayer"></div>';
            const textNode = document.createTextNode('popup text');
            document.querySelector('.annotationLayer')?.appendChild(textNode);

            expect(dispatchCancelableEvent(textNode).defaultPrevented).toBe(true);
        });

        test('should leave events outside the annotation layer alone', () => {
            document.body.innerHTML = '<div class="textLayer"><span></span></div>';

            expect(dispatchCancelableEvent(document.querySelector('span') as Node).defaultPrevented).toBe(false);
        });
    });

    describe('isPointInRect()', () => {
        const rect = { bottom: 100, left: 0, right: 100, top: 0 };

        test.each`
            x      | y      | expected
            ${50}  | ${50}  | ${true}
            ${0}   | ${100} | ${true}
            ${101} | ${50}  | ${false}
            ${50}  | ${-1}  | ${false}
        `('should return $expected for ($x, $y)', ({ x, y, expected }) => {
            expect(isPointInRect(x, y, rect)).toBe(expected);
        });
    });

    describe('getWheelDeltaPx()', () => {
        const field = document.createElement('textarea');
        setElementSizes(field, { clientHeight: 50, clientWidth: 80 });

        test.each`
            deltaMode                     | expected
            ${WheelEvent.DOM_DELTA_PIXEL} | ${{ deltaX: 1, deltaY: 2 }}
            ${WheelEvent.DOM_DELTA_LINE}  | ${{ deltaX: 16, deltaY: 32 }}
            ${WheelEvent.DOM_DELTA_PAGE}  | ${{ deltaX: 80, deltaY: 100 }}
        `('should convert deltaMode $deltaMode to pixels', ({ deltaMode, expected }) => {
            expect(getWheelDeltaPx({ deltaMode, deltaX: 1, deltaY: 2 }, field)).toEqual(expected);
        });
    });

    describe('canScrollAlong()', () => {
        let field: HTMLTextAreaElement;

        beforeEach(() => {
            field = document.createElement('textarea');
            setElementSizes(field, { clientHeight: 50, scrollHeight: 200, clientWidth: 50, scrollWidth: 50 });
        });

        test.each`
            scenario                                      | axis   | delta  | scrollTop | expected
            ${'down with content below'}                  | ${'y'} | ${10}  | ${0}      | ${true}
            ${'down at the bottom'}                       | ${'y'} | ${10}  | ${150}    | ${false}
            ${'up with content above'}                    | ${'y'} | ${-10} | ${100}    | ${true}
            ${'up at the top'}                            | ${'y'} | ${-10} | ${0}      | ${false}
            ${'sideways when the content fits the width'} | ${'x'} | ${10}  | ${0}      | ${false}
        `('should return $expected when scrolling $scenario', ({ axis, delta, scrollTop, expected }) => {
            field.scrollTop = scrollTop;

            expect(canScrollAlong(field, axis, delta)).toBe(expected);
        });

        test('should not scroll an axis with hidden overflow', () => {
            field.style.overflowY = 'hidden';

            expect(canScrollAlong(field, 'y', 10)).toBe(false);
        });
    });

    describe('isWithinScrollableElement()', () => {
        let boundaryEl: HTMLElement;
        let scrollerEl: HTMLElement;
        let targetEl: HTMLElement;

        beforeEach(() => {
            boundaryEl = document.createElement('div');
            boundaryEl.innerHTML = '<div class="scroller"><span class="target"></span></div>';
            scrollerEl = boundaryEl.querySelector('.scroller') as HTMLElement;
            targetEl = boundaryEl.querySelector('.target') as HTMLElement;
            setElementSizes(scrollerEl, { clientHeight: 50, scrollHeight: 200, scrollTop: 0 });
        });

        test('should find a scrollable ancestor that can move in the wheel direction', () => {
            scrollerEl.style.overflowY = 'auto';

            expect(isWithinScrollableElement(targetEl, boundaryEl, 'y', 30)).toBe(true);
            expect(isWithinScrollableElement(targetEl, boundaryEl, 'y', -30)).toBe(false);
        });

        test('should ignore overflowing content that does not scroll', () => {
            expect(isWithinScrollableElement(targetEl, boundaryEl, 'y', 30)).toBe(false);
        });

        test('should stop at the boundary element', () => {
            boundaryEl.style.overflowY = 'auto';
            setElementSizes(boundaryEl, { clientHeight: 50, scrollHeight: 200, scrollTop: 0 });

            expect(isWithinScrollableElement(targetEl, boundaryEl, 'y', 30)).toBe(false);
        });
    });

    describe('applyFieldBorders()', () => {
        let layerEl: HTMLElement;

        const getContainer = (id: string): HTMLElement =>
            layerEl.querySelector(`[data-annotation-id="${id}"]`) as HTMLElement;

        beforeEach(() => {
            layerEl = document.createElement('div');
            layerEl.innerHTML = `
                <div class="annotationLayer">
                    <section class="textWidgetAnnotation" data-annotation-id="text"><textarea></textarea></section>
                    <section class="choiceWidgetAnnotation" data-annotation-id="choice"><select></select></section>
                    <section class="textWidgetAnnotation" data-annotation-id="uncolored"><input /></section>
                    <section class="textWidgetAnnotation hasOwnCanvas" data-annotation-id="painted"><input /></section>
                    <section class="buttonWidgetAnnotation checkBox" data-annotation-id="checkbox"><input type="checkbox" /></section>
                    <section class="textWidgetAnnotation" data-annotation-id="declared" style="border-width: 3px"><input /></section>
                </div>
            `;
        });

        const blackStroke = new Uint8ClampedArray([0, 0, 0]);
        const fieldObjects = new Map([
            ['choice', [{ id: 'choice', strokeColor: new Uint8ClampedArray([255, 0, 0]) }]],
            ['checkbox', [{ id: 'checkbox', strokeColor: blackStroke }]],
            ['declared', [{ id: 'declared', strokeColor: blackStroke }]],
            ['painted', [{ id: 'painted', strokeColor: blackStroke }]],
            ['text', [{ id: 'text', strokeColor: blackStroke }]],
            ['uncolored', [{ id: 'uncolored', strokeColor: null }]],
        ]);

        test('should border text and choice fields in their PDF border color', () => {
            applyFieldBorders(layerEl, fieldObjects);

            expect(getContainer('text').style.borderColor).toBe('rgb(0, 0, 0)');
            expect(getContainer('choice').style.borderColor).toBe('rgb(255, 0, 0)');
            expect(getContainer('text').style.borderStyle).toBe('solid');
        });

        test.each(['uncolored', 'painted', 'checkbox'])('should leave the %s field unbordered', id => {
            applyFieldBorders(layerEl, fieldObjects);

            expect(getContainer(id).style.borderStyle).toBe('');
        });

        test('should keep a border pdf.js already drew from the PDF', () => {
            applyFieldBorders(layerEl, fieldObjects);

            expect(getContainer('declared').style.borderWidth).toBe('3px');
            expect(getContainer('declared').style.borderStyle).toBe('');
        });

        test('should do nothing without field objects', () => {
            applyFieldBorders(layerEl, null);

            expect(getContainer('text').style.borderStyle).toBe('');
        });
    });

    describe('lockFormField()', () => {
        test.each(['textarea', 'input'])('should make a %s read-only but enabled', tagName => {
            const field = document.createElement(tagName) as HTMLInputElement | HTMLTextAreaElement;
            field.disabled = true;
            lockFormField(field);

            expect(field.readOnly).toBe(true);
            expect(field.disabled).toBe(false);
        });

        test.each(['checkbox', 'radio'])('should disable a %s input', type => {
            const field = document.createElement('input');
            field.type = type;
            lockFormField(field);

            expect(field.disabled).toBe(true);
        });

        test('should disable a select', () => {
            const field = document.createElement('select');
            lockFormField(field);

            expect(field.disabled).toBe(true);
        });
    });
});
