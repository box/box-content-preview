/* eslint-disable no-unused-expressions */
import {
    createButton,
    createCheckbox,
    createDropdown,
    createLabel,
    createPullup,
    createRow,
    UIRegistry
} from '../Box3DUIUtils';

import {
    CSS_CLASS_OVERLAY,
    CSS_CLASS_PULLUP,
    CSS_CLASS_SETTINGS_PANEL_LABEL,
    CSS_CLASS_SETTINGS_PANEL_ROW,
    CSS_CLASS_HIDDEN
} from '../model3d/model3DConstants';


import {
    CLASS_BOX_PREVIEW_BUTTON,
    CLASS_BOX_PREVIEW_LINK,
    CLASS_BOX_PREVIEW_MENU,
    CLASS_BOX_PREVIEW_OVERLAY,
    CLASS_BOX_PREVIEW_OVERLAY_WRAPPER,
    CLASS_BOX_PREVIEW_TOGGLE_OVERLAY
} from '../../../constants';

const sandbox = sinon.sandbox.create();

let containerEl;

describe('lib/viewers/box3d/Box3DUIUtils', () => {
    before(() => {
        fixture.setBase('src/lib');
    });

    beforeEach(() => {
        fixture.load('viewers/box3d/__tests__/Box3DUIUtils-test.html');
        containerEl = document.querySelector('.container');
    });

    afterEach(() => {
        sandbox.verifyAndRestore();
        fixture.cleanup();
    });

    describe('createLabel()', () => {
        it('should return a div element', () => {
            const el = createLabel();
            expect(el.nodeName).to.equal('DIV');
        });

        it('should have CSS_CLASS_SETTINGS_PANEL_LABEL class', () => {
            const el = createLabel();
            expect(el).to.have.class(CSS_CLASS_SETTINGS_PANEL_LABEL);
        });

        it('should have text content that has been provided', () => {
            const text = 'my_label_text';
            const el = createLabel(text);
            expect(el).to.have.text(text);
        });

        it('should put empty text if none provided', () => {
            const el = createLabel();
            expect(el.textContent).to.be.empty;
        });
    });

    describe('createButton()', () => {
        it('should return a button element', () => {
            const el = createButton();
            expect(el.nodeName).to.equal('BUTTON');
        });

        it('should have CLASS_BOX_PREVIEW_BUTTON class', () => {
            const el = createButton();
            expect(el).to.have.class(CLASS_BOX_PREVIEW_BUTTON);
        });

        it('should have text content that has been provided', () => {
            const text = 'my_button_text';
            const el = createButton(text);
            expect(el).to.have.text(text);
        });

        it('should put empty text if none provided', () => {
            const el = createButton();
            expect(el.textContent).to.be.empty;
        });
    });

    describe('createCheckbox()', () => {
        it('should return a checkbox element', () => {
            const el = createCheckbox();
            expect(el.nodeName).to.equal('INPUT');
            expect(el.type).to.equal('checkbox');
        });
    });

    describe('createPullup()', () => {
        it('should create a div element', () => {
            const el = createPullup();
            expect(el.nodeName).to.equal('DIV');
        });

        it('should have classes for Overlay, Pullup, and Hidden', () => {
            const el = createPullup();
            expect(el).to.have.class(CSS_CLASS_OVERLAY);
            expect(el).to.have.class(CSS_CLASS_PULLUP);
            expect(el).to.have.class(CSS_CLASS_HIDDEN);
        });
    });

    describe('createRow()', () => {
        it('should create a div', () => {
            const el = createRow();
            expect(el.nodeName).to.equal('DIV');
        });

        it('should apply class CSS_CLASS_SETTINGS_PANEL_ROW', () => {
            const el = createRow();
            expect(el).to.have.class(CSS_CLASS_SETTINGS_PANEL_ROW);
        });

        it('should not contain a label if no text is provided', () => {
            const el = createRow();
            expect(el).to.not.contain(`div.${CSS_CLASS_SETTINGS_PANEL_LABEL}`);
        });

        it('should contain a label if text is provided', () => {
            const labelSelector = `div.${CSS_CLASS_SETTINGS_PANEL_LABEL}`;
            const labelText = 'yay';
            const el = createRow(labelText);
            expect(el).to.contain(labelSelector);
            expect(el.querySelector(labelSelector)).to.have.text(labelText);
        });
    });

    describe('createDropdown()', () => {
        it('should create a row element as the main wrapper', () => {
            const dd = createDropdown();
            expect(dd.nodeName).to.equal('DIV');
            expect(dd).to.have.class(CSS_CLASS_SETTINGS_PANEL_ROW);
        });

        it('should add a row element with provided labelText', () => {
            const text = 'my_row';
            const labelSel = `div.${CSS_CLASS_SETTINGS_PANEL_LABEL}`;
            const dd = createDropdown(text);
            expect(dd).to.contain(labelSel);
            expect(dd.querySelector(labelSel)).to.have.text(text);
        });

        it('should contain a overlay container div', () => {
            const dd = createDropdown();
            expect(dd).to.contain(`div.${CLASS_BOX_PREVIEW_TOGGLE_OVERLAY}`);
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

            it('should nest an overlay wrapper (for all content) in the overlay wrapper', () => {
                expect(dd).to.contain(overlayWrapperSel);
            });

            it('should append CLASS_BOX_PREVIEW_OVERLAY div to overlay wrapper', () => {
                expect(overlayWrapperEl).to.contain(`div.${CLASS_BOX_PREVIEW_OVERLAY}`);
            });

            it('should append menu with class CLASS_BOX_PREVIEW_MENU to CLASS_BOX_PREVIEW_OVERLAY div', () => {
                expect(dd).to.contain(`div.${CLASS_BOX_PREVIEW_OVERLAY} menu.${CLASS_BOX_PREVIEW_MENU}`);
            });

            it('should append div with class \'link-group\' to CLASS_BOX_PREVIEW_MENU', () => {
                expect(dd).to.contain(`menu.${CLASS_BOX_PREVIEW_MENU} div.link-group`);
            });

            it('should append an ul element to link-group', () => {
                expect(dd).to.contain('div.link-group ul');
            });
        });


        it('should nest a button element for opening a dropdown', () => {
            const dropdown = createDropdown();
            expect(dropdown).to.contain(`button.${CLASS_BOX_PREVIEW_BUTTON}`);
        });

        it('should set the button element\'s text to the provided listText', () => {
            const buttonText = 'Gasp! Button!';
            const dropdown = createDropdown('', buttonText);
            expect(dropdown.querySelector(`button.${CLASS_BOX_PREVIEW_BUTTON}`)).to.have.text(buttonText);
        });

        describe('dropdown list population', () => {
            const text = 'I\'m and entry!';
            const listEntries = [
                {
                    text
                }
            ];
            let ddList;// The ul is from the link-group that comes from the overlay wrapper
            beforeEach(() => {
                const dd = createDropdown('', '', listEntries);
                ddList = dd.querySelector(`div.${CLASS_BOX_PREVIEW_OVERLAY} ul`);
            });

            afterEach(() => {
                ddList = null;
            });

            it('should create a list element and append it to the dropdown list', () => {
                expect(ddList).to.contain('li');
            });

            it('should append an anchor tag with class CLASS_BOX_PREVIEW_LINK to the list item', () => {
                expect(ddList.querySelector('li')).to.contain(`a.${CLASS_BOX_PREVIEW_LINK}`);
            });

            it('should set textContent of anchor tag in list item to entry.text', () => {
                const listItem = ddList.querySelector('li');
                expect(listItem.querySelector(`a.${CLASS_BOX_PREVIEW_LINK}`)).to.have.text(text);
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
            it('should create an empty event registry', () => {
                expect(registry.registry).to.be.an('object');
                expect(registry.registry).to.be.empty;
            });
        });

        describe('registerItem()', () => {
            it('should throw an error if no uniqueId provided', () => {
                const registerFail = () => {
                    registry.registerItem();
                };
                expect(registerFail).to.throw(Error);
            });

            it('should throw an error if no element provided', () => {
                const registerFail = () => {
                    registry.registerItem('uuid');
                };
                expect(registerFail).to.throw(Error);
            });

            describe('add new entries to event registry', () => {
                const id = 'my_new_item';
                const element = document.createElement('div');
                beforeEach(() => {
                    expect(registry.registry[id]).to.not.exist;
                    registry.registerItem(id, element);
                });

                it('should create a new entry in the event registry', () => {
                    const entry = registry.registry[id];
                    expect(entry).to.exist;
                });

                it('should add the unique id as property .uuid of new entry', () => {
                    const entry = registry.registry[id];
                    expect(entry.uuid).to.exist;
                    expect(entry.uuid).to.equal(id);
                });

                it('should add element as property .el of new entry', () => {
                    const entry = registry.registry[id];
                    expect(entry.el).to.exist;
                    expect(entry.el).to.equal(element);
                });

                it('should add new empty object as property .events of new entry', () => {
                    const entry = registry.registry[id];
                    expect(entry.events).to.be.an('object');
                    expect(entry.events).to.be.empty;
                });
            });


            it('should not register any events if no event name provided', () => {
                const id = '321';
                const el = document.createElement('div');
                registry.registerItem(id, el);

                expect(registry.registry[id].events).to.be.empty;
            });

            it('should not register any events if not callback provided', () => {
                const id = '321';
                const el = document.createElement('div');
                registry.registerItem(id, el, 'an_event');

                expect(registry.registry[id].events).to.be.empty;
            });

            it('should register an event with name and callback provided', () => {
                const id = '321';
                const el = document.createElement('div');
                registry.registerItem(id, el, 'an_event', () => {});

                expect(registry.registry[id].events).to.not.be.empty;
            });

            it('should add callback to list of registered events, with the same event name', () => {
                const id = '321';
                const el = document.createElement('div');
                const eventName = 'an_event';
                registry.registerItem(id, el, eventName, () => {});
                registry.registerItem(id, el, eventName, () => {});// second event added with same name

                expect(registry.registry[id].events[eventName]).to.have.lengthOf(2);
            });

            it('should register multiple events with different names', () => {
                const id = '321';
                const el = document.createElement('div');
                const eventName1 = 'an_event';
                const eventName2 = 'another_event';
                registry.registerItem(id, el, eventName1, () => {});
                registry.registerItem(id, el, eventName2, () => {});// second event added with same name

                expect(registry.registry[id].events).to.have.keys([eventName1, eventName2]);
            });

            it('should bind the event and callback provided to the supplied element', () => {
                const id = '321';
                const el = document.createElement('div');
                const attachStub = sandbox.stub(el, 'addEventListener');
                const eventName = 'an_event';

                registry.registerItem(id, el, eventName, () => {});

                expect(attachStub).to.be.called;
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

            it('should do nothing if the item provided does not exist in the registry', () => {
                const parentEl = {
                    removeChild: sandbox.stub()
                };

                const item = {
                    el: {
                        parentElement: parentEl
                    }
                };

                registry.unregisterItem(item);

                expect(parentEl.removeChild).to.not.be.called;
            });

            it('should remove the element, for the item, from its parent element', () => {
                const removeStub = sandbox.spy(containerEl, 'removeChild');
                containerEl.appendChild(el);

                registry.unregisterItem(registeredItem);

                expect(removeStub).to.be.called;
            });

            it('should unbind events on an element in the registry, for an item', () => {
                const removeListenerStub = sandbox.stub(el, 'removeEventListener');

                registry.unregisterItem(registeredItem);

                expect(removeListenerStub).to.be.called;
            });

            it('should remove the list of events from the registry, for an item', () => {
                const events = registeredItem.events;
                const eventNames = Object.keys(registeredItem.events);

                registry.unregisterItem(registeredItem);

                expect(events).to.not.have.keys(eventNames);
            });

            it('should remove the element from the registry, for an item', () => {
                registry.unregisterItem(registeredItem);
                expect(registeredItem.el).to.not.exist;
            });

            it('should remove the item from the registry', () => {
                registry.unregisterItem(registeredItem);
                expect(registry.registry[id]).to.not.exist;
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

            it('should unregister items from the registry', () => {
                const removeListenerStub = sandbox.stub(el, 'removeEventListener');
                registry.unregisterAll();
                expect(removeListenerStub).to.be.called;
            });

            it('should clear the registry completely', () => {
                registry.unregisterAll();
                expect(registry.registry).to.be.empty;
            });
        });
    });
});
