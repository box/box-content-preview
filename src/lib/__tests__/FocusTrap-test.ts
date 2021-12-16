import FocusTrap from '../FocusTrap';

declare const fixture: {
    load: (path: string) => void;
};

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
        let anchorFirstElement: HTMLElement;
        let anchorLastElement: HTMLElement;
        let anchorTrapElement: HTMLElement;
        let firstInput: HTMLElement;
        let focusTrap;
        let secondInput: HTMLElement;

        const getTestElement = (selector: string): HTMLElement =>
            getContainerElement().querySelector<HTMLElement>(selector) as HTMLElement;

        beforeEach(() => {
            focusTrap = getFocusTrap();
            focusTrap.enable();

            anchorFirstElement = getTestElement('.bp-FocusTrap-first');
            anchorLastElement = getTestElement('.bp-FocusTrap-last');
            anchorTrapElement = getTestElement('.bp-FocusTrap-trap');
            firstInput = getTestElement('.firstInput');
            secondInput = getTestElement('.secondInput');
        });

        test('should redirect focus from first anchor to last focusable element', () => {
            firstInput.focus();
            expect(document.activeElement).toBe(firstInput);

            anchorFirstElement.focus();
            expect(document.activeElement).toBe(secondInput);
        });

        test('should redirect focus from last anchor to first focusable element', () => {
            secondInput.focus();
            expect(document.activeElement).toBe(secondInput);

            anchorLastElement.focus();
            expect(document.activeElement).toBe(firstInput);
        });

        test('should keep focus trapped on trap anchor when Tab is pressed', () => {
            anchorTrapElement.focus();
            expect(document.activeElement).toBe(anchorTrapElement);

            const mockEvent = new KeyboardEvent('keydown', { key: 'Tab' });
            jest.spyOn(mockEvent, 'stopPropagation');
            jest.spyOn(mockEvent, 'preventDefault');

            anchorTrapElement.dispatchEvent(mockEvent);
            expect(document.activeElement).toBe(anchorTrapElement);
            expect(mockEvent.stopPropagation).toBeCalled();
            expect(mockEvent.preventDefault).toBeCalled();
        });

        test('should keep focus trapped on trap anchor when Shift+Tab is pressed', () => {
            anchorTrapElement.focus();
            expect(document.activeElement).toBe(anchorTrapElement);

            const mockEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
            jest.spyOn(mockEvent, 'stopPropagation');
            jest.spyOn(mockEvent, 'preventDefault');

            anchorTrapElement.dispatchEvent(mockEvent);
            expect(document.activeElement).toBe(anchorTrapElement);
            expect(mockEvent.stopPropagation).toBeCalled();
            expect(mockEvent.preventDefault).toBeCalled();
        });

        test.each(['Enter', 'Escape', 'ArrowDown'])('should do nothing if key %s is pressed', key => {
            anchorTrapElement.focus();
            expect(document.activeElement).toBe(anchorTrapElement);

            const mockEvent = new KeyboardEvent('keydown', { key });
            jest.spyOn(mockEvent, 'stopPropagation');
            jest.spyOn(mockEvent, 'preventDefault');

            anchorTrapElement.dispatchEvent(mockEvent);
            expect(document.activeElement).toBe(anchorTrapElement);
            expect(mockEvent.stopPropagation).not.toBeCalled();
            expect(mockEvent.preventDefault).not.toBeCalled();
        });

        test('should focus first element if Tab is pressed when container element has focus', () => {
            const container = getContainerElement();
            container.focus();
            expect(document.activeElement).toBe(container);

            const mockEvent = new KeyboardEvent('keydown', { key: 'Tab' });
            jest.spyOn(mockEvent, 'stopPropagation');
            jest.spyOn(mockEvent, 'preventDefault');

            container.dispatchEvent(mockEvent);
            expect(document.activeElement).toBe(firstInput);
            expect(mockEvent.stopPropagation).toBeCalled();
            expect(mockEvent.preventDefault).toBeCalled();
        });

        test('should focus first element if Tab is pressed when container element has focus', () => {
            const container = getContainerElement();
            container.focus();
            expect(document.activeElement).toBe(container);

            const mockEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
            jest.spyOn(mockEvent, 'stopPropagation');
            jest.spyOn(mockEvent, 'preventDefault');

            container.dispatchEvent(mockEvent);
            expect(document.activeElement).toBe(secondInput);
            expect(mockEvent.stopPropagation).toBeCalled();
            expect(mockEvent.preventDefault).toBeCalled();
        });

        test.each(['Enter', 'Escape', 'ArrowDown'])(
            'should do nothing if %s is pressed when container element has focus',
            key => {
                const container = getContainerElement();
                container.focus();
                expect(document.activeElement).toBe(container);

                const mockEvent = new KeyboardEvent('keydown', { key });
                jest.spyOn(mockEvent, 'stopPropagation');
                jest.spyOn(mockEvent, 'preventDefault');

                container.dispatchEvent(mockEvent);
                expect(document.activeElement).toBe(container);
                expect(mockEvent.stopPropagation).not.toBeCalled();
                expect(mockEvent.preventDefault).not.toBeCalled();
            },
        );
    });
});
