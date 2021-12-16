import FocusTrap from '../FocusTrap';

describe('lib/FocusTrap', () => {
    beforeEach(() => {
        // Fixture has 2 input elements as children
        fixture.load('__tests__/FocusTrap-test.html');
    });

    const getContainerElement = (): HTMLElement =>
        document.querySelector<HTMLElement>('#test-container') as HTMLElement;
    const getFocusTrap = (): FocusTrap => new FocusTrap(getContainerElement());

    describe('constructor', () => {
        test('should save reference to element', () => {
            const focusTrap = getFocusTrap();

            expect(focusTrap.element).toBe(getContainerElement());
        });
    });

    describe('enable()', () => {
        test('should add 3 focus anchor elements', () => {
            const focusTrap = getFocusTrap();
            expect(getContainerElement().children.length).toBe(2);

            focusTrap.enable();

            const children = Array.from(getContainerElement().children);
            expect(children.length).toBe(5);
            expect(children[0].tagName.toLowerCase()).toBe('i');
            expect(children[1].tagName.toLowerCase()).toBe('input');
            expect(children[2].tagName.toLowerCase()).toBe('input');
            expect(children[3].tagName.toLowerCase()).toBe('i');
            expect(children[4].tagName.toLowerCase()).toBe('i');
        });
    });

    describe('disable()', () => {
        test('should remove the 3 focus anchor elements', () => {
            const focusTrap = getFocusTrap();
            expect(getContainerElement().children.length).toBe(2);

            focusTrap.enable();
            expect(getContainerElement().children.length).toBe(5);

            focusTrap.disable();
            expect(getContainerElement().children.length).toBe(2);
        });
    });

    describe('focus management', () => {
        let children: Array<HTMLElement>;
        let focusTrap;

        beforeEach(() => {
            jest.spyOn(Event.prototype, 'stopPropagation');
            jest.spyOn(Event.prototype, 'preventDefault');

            focusTrap = getFocusTrap();
            focusTrap.enable();

            children = Array.from(getContainerElement().children) as Array<HTMLElement>;
        });

        test('should redirect focus from first anchor to last focusable element', () => {
            children[1].focus(); // first input
            expect(document.activeElement).toBe(children[1]);

            children[0].focus(); // first focus anchor element
            expect(document.activeElement).toBe(children[2]);
        });

        test('should redirect focus from last anchor to first focusable element', () => {
            children[2].focus(); // second input
            expect(document.activeElement).toBe(children[2]);

            children[3].focus(); // last focus anchor element
            expect(document.activeElement).toBe(children[1]);
        });

        test('should keep focus trapped on trap anchor when Tab is pressed', () => {
            children[4].focus(); // trap focus anchor element
            expect(document.activeElement).toBe(children[4]);

            children[4].dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
            expect(document.activeElement).toBe(children[4]);
            expect(Event.prototype.stopPropagation).toHaveBeenCalled();
            expect(Event.prototype.preventDefault).toHaveBeenCalled();
        });

        test('should keep focus trapped on trap anchor when Shift+Tab is pressed', () => {
            children[4].focus(); // trap focus anchor element
            expect(document.activeElement).toBe(children[4]);

            children[4].dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }));
            expect(document.activeElement).toBe(children[4]);
            expect(Event.prototype.stopPropagation).toHaveBeenCalled();
            expect(Event.prototype.preventDefault).toHaveBeenCalled();
        });

        test.each(['Enter', 'Escape', 'ArrowDown'])('should do nothing if key %s is pressed', key => {
            children[4].focus(); // trap focus anchor element
            expect(document.activeElement).toBe(children[4]);

            children[4].dispatchEvent(new KeyboardEvent('keydown', { key }));
            expect(document.activeElement).toBe(children[4]);
            expect(Event.prototype.stopPropagation).not.toHaveBeenCalled();
            expect(Event.prototype.preventDefault).not.toHaveBeenCalled();
        });

        test('should focus first element if Tab is pressed when container element has focus', () => {
            const container = getContainerElement();
            container.focus();
            expect(document.activeElement).toBe(container);

            container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
            expect(document.activeElement).toBe(children[1]);
            expect(Event.prototype.stopPropagation).toHaveBeenCalled();
            expect(Event.prototype.preventDefault).toHaveBeenCalled();
        });

        test('should focus first element if Tab is pressed when container element has focus', () => {
            const container = getContainerElement();
            container.focus();
            expect(document.activeElement).toBe(container);

            container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }));
            expect(document.activeElement).toBe(children[2]);
            expect(Event.prototype.stopPropagation).toHaveBeenCalled();
            expect(Event.prototype.preventDefault).toHaveBeenCalled();
        });

        test.each(['Enter', 'Escape', 'ArrowDown'])(
            'should do nothing if %s is pressed when container element has focus',
            key => {
                const container = getContainerElement();
                container.focus();
                expect(document.activeElement).toBe(container);

                container.dispatchEvent(new KeyboardEvent('keydown', { key }));
                expect(document.activeElement).toBe(container);
                expect(Event.prototype.stopPropagation).not.toHaveBeenCalled();
                expect(Event.prototype.preventDefault).not.toHaveBeenCalled();
            },
        );
    });
});
