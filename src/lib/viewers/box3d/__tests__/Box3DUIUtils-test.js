/* eslint-disable no-unused-expressions */
import {
    createButton,
    createCheckbox,
    createDropdown,
    createLabel,
    createPullup,
    createRow,
    UIRegistry,
} from '../Box3DUIUtils';

import {
    CSS_CLASS_OVERLAY,
    CSS_CLASS_PULLUP,
    CSS_CLASS_SETTINGS_PANEL_LABEL,
    CSS_CLASS_SETTINGS_PANEL_ROW,
    CSS_CLASS_HIDDEN,
} from '../model3d/model3DConstants';

import {
    CLASS_BOX_PREVIEW_BUTTON,
    CLASS_BOX_PREVIEW_LINK,
    CLASS_BOX_PREVIEW_MENU,
    CLASS_BOX_PREVIEW_OVERLAY,
    CLASS_BOX_PREVIEW_OVERLAY_WRAPPER,
    CLASS_BOX_PREVIEW_TOGGLE_OVERLAY,
} from '../../../constants';

let containerEl;

describe('lib/viewers/box3d/Box3DUIUtils', () => {
    beforeEach(() => {
        fixture.load('viewers/box3d/__tests__/Box3DUIUtils-test.html');
        containerEl = document.querySelector('.container');
    });

    afterEach(() => {
        fixture.cleanup();
    });

    describe('createLabel()', () => {
        test('should return a div element', () => {
            const el = createLabel();
            expect(el.nodeName).toBe('DIV');
        });

        test('should have CSS_CLASS_SETTINGS_PANEL_LABEL class', () => {
            const el = createLabel();
            expect(el).toHaveClass(CSS_CLASS_SETTINGS_PANEL_LABEL);
        });

        test('should have text content that has been provided', () => {
            const text = 'my_label_text';
            const el = createLabel(text);
            expect(el).toHaveTextContent(text);
        });

        test('should put empty text if none provided', () => {
            const el = createLabel();
            expect(el.textContent).toEqual('');
        });
    });

    describe('createButton()', () => {
        test('should return a button element', () => {
            const el = createButton();
            expect(el.nodeName).toBe('BUTTON');
        });

        test('should have CLASS_BOX_PREVIEW_BUTTON class', () => {
            const el = createButton();
            expect(el).toHaveClass(CLASS_BOX_PREVIEW_BUTTON);
        });

        test('should have text content that has been provided', () => {
            const text = 'my_button_text';
            const el = createButton(text);
            expect(el).toHaveTextContent(text);
        });

        test('should put empty text if none provided', () => {
            const el = createButton();
            expect(el.textContent).toEqual('');
        });
    });

    describe('createCheckbox()', () => {
        test('should return a checkbox element', () => {
            const el = createCheckbox();
            expect(el.nodeName).toBe('INPUT');
            expect(el.type).toBe('checkbox');
        });
    });

    describe('createPullup()', () => {
        test('should create a div element', () => {
            const el = createPullup();
            expect(el.nodeName).toBe('DIV');
        });

        test('should have classes for Overlay, Pullup, and Hidden', () => {
            const el = createPullup();
            expect(el).toHaveClass(CSS_CLASS_OVERLAY);
            expect(el).toHaveClass(CSS_CLASS_PULLUP);
            expect(el).toHaveClass(CSS_CLASS_HIDDEN);
        });
    });

    describe('createRow()', () => {
        test('should create a div', () => {
            const el = createRow();
            expect(el.nodeName).toBe('DIV');
        });

        test('should apply class CSS_CLASS_SETTINGS_PANEL_ROW', () => {
            const el = createRow();
            expect(el).toHaveClass(CSS_CLASS_SETTINGS_PANEL_ROW);
        });

        test('should not contain a label if no text is provided', () => {
            const el = createRow();
            expect(el.querySelector(`div.${CSS_CLASS_SETTINGS_PANEL_LABEL}`)).toBeNull();
        });

        test('should contain a label if text is provided', () => {
            const labelSelector = `div.${CSS_CLASS_SETTINGS_PANEL_LABEL}`;
            const labelText = 'yay';
            const el = createRow(labelText);
            expect(el.querySelector(labelSelector)).toBeTruthy();
            expect(el.querySelector(labelSelector)).toHaveTextContent(labelText);
        });
    });

    describe('createDropdown()', () => {
        test('should create a row element as the main wrapper', () => {
            const dd = createDropdown();
            expect(dd.nodeName).toBe('DIV');
            expect(dd).toHaveClass(CSS_CLASS_SETTINGS_PANEL_ROW);
        });

        test('should add a row element with provided labelText', () => {
            const text = 'my_row';
            const labelSel = `div.${CSS_CLASS_SETTINGS_PANEL_LABEL}`;
            const dd = createDropdown(text);
            expect(dd.querySelector(labelSel)).toBeTruthy();
            expect(dd.querySelector(labelSel)).toHaveTextContent(text);
        });

        test('should contain a overlay container div', () => {
            const dd = createDropdown();
            expect(dd.querySelector(`div.${CLASS_BOX_PREVIEW_TOGGLE_OVERLAY}`)).toBeTruthy();
        });

        describe('add overlay wrapper with menu content to dropdown', () => {
            let dd;
            let overlayWrapperEl;
            const overlayWrapperSel = `div.${CLASS_BOX_PREVIEW_OVERLAY_WRAPPER}`;
            beforeEach(() => {
                dd = createDropdown();
                overlayWrapperEl = dd.querySelector(overlayWrapperSel);
            });

            afterEach(() => {
                dd = null;
                overlayWrapperEl = null;
            });

            test('should nest an overlay wrapper (for all content) in the overlay wrapper', () => {
                expect(dd.querySelector(overlayWrapperSel)).toBeTruthy();
            });

            test('should append CLASS_BOX_PREVIEW_OVERLAY div to overlay wrapper', () => {
                expect(overlayWrapperEl.querySelector(`div.${CLASS_BOX_PREVIEW_OVERLAY}`)).toBeTruthy();
            });

            test('should append menu with class CLASS_BOX_PREVIEW_MENU to CLASS_BOX_PREVIEW_OVERLAY div', () => {
                expect(
                    dd.querySelector(`div.${CLASS_BOX_PREVIEW_OVERLAY} menu.${CLASS_BOX_PREVIEW_MENU}`),
                ).toBeTruthy();
            });

            test("should append div with class 'link-group' to CLASS_BOX_PREVIEW_MENU", () => {
                expect(dd.querySelector(`menu.${CLASS_BOX_PREVIEW_MENU} div.link-group`)).toBeTruthy();
            });

            test('should append an ul element to link-group', () => {
                expect(dd.querySelector('div.link-group ul')).toBeTruthy();
            });
        });

        test('should nest a button element for opening a dropdown', () => {
            const dropdown = createDropdown();
            expect(dropdown.querySelector(`button.${CLASS_BOX_PREVIEW_BUTTON}`)).toBeTruthy();
        });

        test("should set the button element's text to the provided listText", () => {
            const buttonText = 'Gasp! Button!';
            const dropdown = createDropdown('', buttonText);
            expect(dropdown.querySelector(`button.${CLASS_BOX_PREVIEW_BUTTON}`)).toHaveTextContent(buttonText);
        });

        describe('dropdown list population', () => {
            const text = "I'm and entry!";
            const listEntries = [
                {
                    text,
                },
            ];
            let ddList; // The ul is from the link-group that comes from the overlay wrapper
            beforeEach(() => {
                const dd = createDropdown('', '', listEntries);
                ddList = dd.querySelector(`div.${CLASS_BOX_PREVIEW_OVERLAY} ul`);
            });

            afterEach(() => {
                ddList = null;
            });

            test('should create a list element and append it to the dropdown list', () => {
                expect(ddList.querySelector('li')).toBeTruthy();
            });

            test('should append an anchor tag with class CLASS_BOX_PREVIEW_LINK to the list item', () => {
                expect(ddList.querySelector('li').querySelector(`a.${CLASS_BOX_PREVIEW_LINK}`)).toBeTruthy();
            });

            test('should set textContent of anchor tag in list item to entry.text', () => {
                const listItem = ddList.querySelector('li');
                expect(listItem.querySelector(`a.${CLASS_BOX_PREVIEW_LINK}`)).toHaveTextContent(text);
            });
        });
    });

    describe('UIRegistry', () => {
        let registry;
        beforeEach(() => {
            registry = new UIRegistry();
        });

        afterEach(() => {
            registry = null;
        });

        describe('constructor()', () => {
            test('should create an empty event registry', () => {
                expect(typeof registry.registry).toBe('object');
                expect(registry.registry).toEqual({});
            });
        });

        describe('registerItem()', () => {
            test('should throw an error if no uniqueId provided', () => {
                /* eslint-disable require-jsdoc */
                const registerFail = () => {
                    registry.registerItem();
                };
                expect(registerFail).toThrowError(Error);
            });

            test('should throw an error if no element provided', () => {
                /* eslint-disable require-jsdoc */
                const registerFail = () => {
                    registry.registerItem('uuid');
                };
                expect(registerFail).toThrowError(Error);
            });

            describe('add new entries to event registry', () => {
                const id = 'my_new_item';
                const element = document.createElement('div');
                beforeEach(() => {
                    expect(registry.registry[id]).not.toBeDefined();
                    registry.registerItem(id, element);
                });

                test('should create a new entry in the event registry', () => {
                    const entry = registry.registry[id];
                    expect(entry).toBeDefined();
                });

                test('should add the unique id as property .uuid of new entry', () => {
                    const entry = registry.registry[id];
                    expect(entry.uuid).toBeDefined();
                    expect(entry.uuid).toBe(id);
                });

                test('should add element as property .el of new entry', () => {
                    const entry = registry.registry[id];
                    expect(entry.el).toBeDefined();
                    expect(entry.el).toBe(element);
                });

                test('should add new empty object as property .events of new entry', () => {
                    const entry = registry.registry[id];
                    expect(typeof entry.events).toBe('object');
                    expect(entry.events).toEqual({});
                });
            });

            test('should not register any events if no event name provided', () => {
                const id = '321';
                const el = document.createElement('div');
                registry.registerItem(id, el);

                expect(registry.registry[id].events).toEqual({});
            });

            test('should not register any events if not callback provided', () => {
                const id = '321';
                const el = document.createElement('div');
                registry.registerItem(id, el, 'an_event');

                expect(registry.registry[id].events).toEqual({});
            });

            test('should register an event with name and callback provided', () => {
                const id = '321';
                const el = document.createElement('div');
                registry.registerItem(id, el, 'an_event', () => {});

                expect(registry.registry[id].events).not.toEqual({});
            });

            test('should add callback to list of registered events, with the same event name', () => {
                const id = '321';
                const el = document.createElement('div');
                const eventName = 'an_event';
                registry.registerItem(id, el, eventName, () => {});
                registry.registerItem(id, el, eventName, () => {}); // second event added with same name

                expect(registry.registry[id].events[eventName]).toHaveLength(2);
            });

            test('should register multiple events with different names', () => {
                const id = '321';
                const el = document.createElement('div');
                const eventName1 = 'an_event';
                const eventName2 = 'another_event';
                registry.registerItem(id, el, eventName1, () => {});
                registry.registerItem(id, el, eventName2, () => {}); // second event added with same name

                expect(Object.keys(registry.registry[id].events)).toEqual([eventName1, eventName2]);
            });

            test('should bind the event and callback provided to the supplied element', () => {
                const id = '321';
                const el = document.createElement('div');
                const attachStub = jest.spyOn(el, 'addEventListener');
                const eventName = 'an_event';

                registry.registerItem(id, el, eventName, () => {});

                expect(attachStub).toBeCalled();
            });
        });

        describe('unregisterItem()', () => {
            const id = 'my_id';
            const eventName = 'click';
            let registeredItem;
            let el;

            beforeEach(() => {
                el = document.createElement('div');
                registry.registerItem(id, el, eventName, () => {});
                registeredItem = registry.registry[id];
            });

            afterEach(() => {
                el = null;
                registeredItem = null;
            });

            test('should do nothing if the item provided does not exist in the registry', () => {
                const parentEl = {
                    removeChild: jest.fn(),
                };

                const item = {
                    el: {
                        parentElement: parentEl,
                    },
                };

                registry.unregisterItem(item);

                expect(parentEl.removeChild).not.toBeCalled();
            });

            test('should remove the element, for the item, from its parent element', () => {
                const removeStub = jest.spyOn(containerEl, 'removeChild');
                containerEl.appendChild(el);

                registry.unregisterItem(registeredItem);

                expect(removeStub).toBeCalled();
            });

            test('should unbind events on an element in the registry, for an item', () => {
                const removeListenerStub = jest.spyOn(el, 'removeEventListener');

                registry.unregisterItem(registeredItem);

                expect(removeListenerStub).toBeCalled();
            });

            test('should remove the list of events from the registry, for an item', () => {
                const { events } = registeredItem;
                const eventNames = Object.keys(registeredItem.events);

                registry.unregisterItem(registeredItem);

                expect(Object.keys(events)).not.toContain(eventNames);
            });

            test('should remove the element from the registry, for an item', () => {
                registry.unregisterItem(registeredItem);
                expect(registeredItem.el).not.toBeDefined();
            });

            test('should remove the item from the registry', () => {
                registry.unregisterItem(registeredItem);
                expect(registry.registry[id]).not.toBeDefined();
            });
        });

        describe('unregisterAll()', () => {
            let el;

            beforeEach(() => {
                const id = 'my_id';
                const eventName = 'click';
                el = document.createElement('div');
                registry.registerItem(id, el, eventName, () => {});
            });

            afterEach(() => {
                el = null;
            });

            test('should unregister items from the registry', () => {
                const removeListenerStub = jest.spyOn(el, 'removeEventListener');
                registry.unregisterAll();
                expect(removeListenerStub).toBeCalled();
            });

            test('should clear the registry completely', () => {
                registry.unregisterAll();
                expect(registry.registry).toEqual({});
            });
        });
    });
});
