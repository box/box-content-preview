import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import cache from '../../Cache';
import { addActivationListener, removeActivationListener, decodeKeydown, insertTemplate } from '../../util';
import { ICON_ARROW_LEFT, ICON_ARROW_RIGHT, ICON_CHECK_MARK } from '../../icons/icons';
import { CLASS_ELEM_KEYBOARD_FOCUS } from '../../constants';

const CLASS_SETTINGS = 'bp-media-settings';
const CLASS_SETTINGS_SELECTED = 'bp-media-settings-selected';
const CLASS_SETTINGS_OPEN = 'bp-media-settings-is-open';
const SELECTOR_SETTINGS_SUB_ITEM = '.bp-media-settings-sub-item';
const SELECTOR_SETTINGS_VALUE = '.bp-media-settings-value';
const MEDIA_SPEEDS = [
    '0.25',
    '0.5',
    '1.0',
    '1.25',
    '1.5',
    '2.0'
];

const SETTINGS_TEMPLATE = `<div class="bp-media-settings">
    <div class="bp-media-settings-menu-main bp-media-settings-menu" role="menu">
        <div class="bp-media-settings-item bp-media-settings-item-speed" data-type="speed" tabindex="0" role="menuitem" aria-haspopup="true">
            <div class="bp-media-settings-label" aria-label="${__('media_speed')}">${__('media_speed')}</div>
            <div class="bp-media-settings-value">${__('media_speed_normal')}</div>
            <div class="bp-media-settings-arrow">${ICON_ARROW_RIGHT}</div>
        </div>
        <div class="bp-media-settings-item bp-media-settings-item-quality" data-type="quality" tabindex="0" role="menuitem" aria-haspopup="true">
            <div class="bp-media-settings-label" aria-label="${__('media_quality')}">${__('media_quality')}</div>
            <div class="bp-media-settings-value">${__('media_quality_auto')}</div>
            <div class="bp-media-settings-arrow">${ICON_ARROW_RIGHT}</div>
        </div>
    </div>
    <div class="bp-media-settings-menu-speed bp-media-settings-menu" role="menu">
        <div class="bp-media-settings-sub-item bp-media-settings-sub-item-speed" data-type="menu" tabindex="0" role="menuitem" aria-haspopup="true">
            <div class="bp-media-settings-arrow">${ICON_ARROW_LEFT}</div>
            <div class="bp-media-settings-label" aria-label="${__('media_speed')}">${__('media_speed')}</div>
        </div>
        <div class="bp-media-settings-sub-item" data-type="speed" data-value="0.25" tabindex="0" role="menuitemradio">
            <div class="bp-media-settings-icon">${ICON_CHECK_MARK}</div>
            <div class="bp-media-settings-value">0.25</div>
        </div>
        <div class="bp-media-settings-sub-item" data-type="speed" data-value="0.5" tabindex="0" role="menuitemradio">
            <div class="bp-media-settings-icon">${ICON_CHECK_MARK}</div>
            <div class="bp-media-settings-value">0.5</div>
        </div>
        <div class="bp-media-settings-sub-item bp-media-settings-selected" data-type="speed" data-value="1.0" tabindex="0" role="menuitemradio" aria-checked="true">
            <div class="bp-media-settings-icon">${ICON_CHECK_MARK}</div>
            <div class="bp-media-settings-value">${__('media_speed_normal')}</div>
        </div>
        <div class="bp-media-settings-sub-item" data-type="speed" data-value="1.25" tabindex="0" role="menuitemradio">
            <div class="bp-media-settings-icon">${ICON_CHECK_MARK}</div>
            <div class="bp-media-settings-value">1.25</div>
        </div>
        <div class="bp-media-settings-sub-item" data-type="speed" data-value="1.5" tabindex="0" role="menuitemradio">
            <div class="bp-media-settings-icon">${ICON_CHECK_MARK}</div>
            <div class="bp-media-settings-value">1.5</div>
        </div>
        <div class="bp-media-settings-sub-item" data-type="speed" data-value="2.0" tabindex="0" role="menuitemradio">
            <div class="bp-media-settings-icon">${ICON_CHECK_MARK}</div>
            <div class="bp-media-settings-value">2.0</div>
        </div>
    </div>
    <div class="bp-media-settings-menu-quality bp-media-settings-menu" role="menu">
        <div class="bp-media-settings-sub-item bp-media-settings-sub-item-quality" data-type="menu" tabindex="0" role="menuitem" aria-haspopup="true">
            <div class="bp-media-settings-arrow">${ICON_ARROW_LEFT}</div>
            <div class="bp-media-settings-label" aria-label="${__('media_quality')}">${__('media_quality')}</div>
        </div>
        <div class="bp-media-settings-sub-item" data-type="quality" data-value="sd" tabindex="0" role="menuitemradio">
            <div class="bp-media-settings-icon">${ICON_CHECK_MARK}</div>
            <div class="bp-media-settings-value">480p</div>
        </div>
        <div class="bp-media-settings-sub-item" data-type="quality" data-value="hd" tabindex="0" role="menuitemradio">
            <div class="bp-media-settings-icon">${ICON_CHECK_MARK}</div>
            <div class="bp-media-settings-value">1080p</div>
        </div>
        <div class="bp-media-settings-sub-item bp-media-settings-selected" data-type="quality" data-value="auto" tabindex="0" role="menuitemradio" aria-checked="true">
            <div class="bp-media-settings-icon">${ICON_CHECK_MARK}</div>
            <div class="bp-media-settings-value">${__('media_quality_auto')}</div>
        </div>
    </div>
</div>`;

@autobind
class Settings extends EventEmitter {

    /**
     * Service to handle the position and movement of a slider element
     *
     * [constructor]
     * @param {HTMLElement} containerEl - container node
     * @return {Settings} Settings menu instance
     */
    constructor(containerEl) {
        super();
        this.containerEl = containerEl;

        insertTemplate(this.containerEl, SETTINGS_TEMPLATE, containerEl.querySelector('.bp-media-controls-wrapper'));
        this.settingsEl = this.containerEl.querySelector('.bp-media-settings');
        this.firstMenuItem = this.settingsEl.querySelectorAll('.bp-media-settings-item')[0];

        this.settingsButtonEl = this.containerEl.querySelector('.bp-media-gear-icon');

        addActivationListener(this.settingsEl, this.menuEventHandler);
        this.visible = false;
        this.init();
    }

    /**
     * Inits the menu
     *
     * @return {void}
     */
    init() {
        const quality = cache.get('media-quality') || 'auto';
        const speed = cache.get('media-speed') || '1.0';

        this.chooseOption('quality', quality);
        this.chooseOption('speed', speed);
    }

    /**
     * [destructor]
     * @return {void}
     */
    destroy() {
        if (this.settingsEl) {
            removeActivationListener(this.settingsEl, this.menuEventHandler);
        }
        document.removeEventListener('click', this.blurHandler);
    }

    /**
     * [destructor]
     * @return {void}
     */
    reset() {
        this.settingsEl.className = CLASS_SETTINGS;
        const mainMenu = this.settingsEl.querySelector('.bp-media-settings-menu-main');
        this.setMenuContainerDimensions(mainMenu);
    }

    /**
     * Getter for testing purposes
     *
     * @private
     * @return {array}
     */
    getMediaSpeeds() {
        return MEDIA_SPEEDS;
    }

    /**
     * Increases the speed one step. If already maximum, does nothing
     *
     * @return {void}
     */
    increaseSpeed() {
        const current = parseFloat(cache.get('media-speed') || '1.0');
        const higherSpeeds = MEDIA_SPEEDS.filter((speed) => parseFloat(speed) > current);
        if (higherSpeeds.length > 0) {
            this.chooseOption('speed', higherSpeeds[0]);
        }
    }

    /**
     * Decreases the speed one step. If already minimum, does nothing
     *
     * @return {void}
     */
    decreaseSpeed() {
        const current = parseFloat(cache.get('media-speed') || '1.0');
        const lowerSpeeds = MEDIA_SPEEDS.filter((speed) => parseFloat(speed) < current);
        if (lowerSpeeds.length > 0) {
            this.chooseOption('speed', lowerSpeeds[lowerSpeeds.length - 1]);
        }
    }

    /**
     * Set the menu dimensions depending on which menu is being shown
     *
     * @private
     * @param {HTMLElement} menu - The menu/submenu to use for sizing the container
     * @return {void}
     */
    setMenuContainerDimensions(menu) {
        // NOTE: need to explicitly set the dimensions in order to get css transitions. width=auto doesn't work with css transitions
        this.settingsEl.style.width = `${menu.offsetWidth + 18}px`;
        // height = n * $item-height + 2 * $padding (see Settings.scss)
        // where n is the number of displayed items in the menu
        const sumHeight = [].reduce.call(menu.children, (sum, child) => sum + child.offsetHeight, 0);
        this.settingsEl.style.height = `${sumHeight + 16}px`;
    }

    /**
     * Finds the parent node that has dataset type
     *
     * @param {HTMLElement} target - start dom location
     * @return {HTMLElement} parent that has dataset type
     */
    findParentDataType(target) {
        let currentNode = target;
        while (currentNode && currentNode !== this.settingsEl) {
            if (typeof currentNode.getAttribute('data-type') === 'string') {
                return currentNode;
                /* eslint-disable no-else-return */
            } else {
                /* eslint-enable no-else-return */
                currentNode = currentNode.parentNode;
            }
        }
        return null;
    }

    /**
     * Show sub-menu
     *
     * @private
     * @param {string} type - Either "speed" or "quality"
     * @return {void}
     */
    showSubMenu(type) {
        const subMenu = this.settingsEl.querySelector(`.bp-media-settings-menu-${type}`);
        this.settingsEl.classList.add(`bp-media-settings-show-${type}`);
        this.setMenuContainerDimensions(subMenu);
        // Move focus to the currently selected value
        const curSelectedOption = this.settingsEl.querySelector(`[data-type="${type}"]${SELECTOR_SETTINGS_SUB_ITEM}.${CLASS_SETTINGS_SELECTED}`);
        curSelectedOption.focus();
    }

    /**
     * Helper method for selecting items/sub-items in the menu
     *
     * @private
     * @param {HTMLElement} menuItem
     * @return {void}
     */
    menuItemSelect(menuItem) {
        const type = menuItem.getAttribute('data-type');
        const value = menuItem.getAttribute('data-value');

        if (type === 'menu') {
            // We are in the sub menu and going back to the main menu
            this.reset();
            this.firstMenuItem.focus();
        } else if (type && value) {
            // We are in the sub-menu and clicked a valid option
            this.chooseOption(type, value);
        } else if (type) {
            this.showSubMenu(type);
        }
    }

    /**
     * Extracts info out of the click target
     *
     * @private
     * @param {Event} event - click event
     * @return {void}
     */
    menuEventHandler(event) {
        // Extract the parent target dataset element (the menu item)
        const menuItem = this.findParentDataType(event.target);
        if (!menuItem) {
            return;
        }

        if (event.type === 'click') {
            this.menuItemSelect(menuItem);
        } else if (event.type === 'keydown') {
            const key = decodeKeydown(event).toLowerCase();
            const menuEl = menuItem.parentElement;
            const itemIdx = [].findIndex.call(menuEl.children, (e) => {
                return e.contains(menuItem);
            });

            switch (key) {
                case 'space':
                case 'enter': {
                    this.containerEl.classList.add(CLASS_ELEM_KEYBOARD_FOCUS);
                    this.menuItemSelect(menuItem);
                    break;
                }
                case 'arrowup': {
                    this.containerEl.classList.add(CLASS_ELEM_KEYBOARD_FOCUS);
                    if (itemIdx > 0) {
                        const newNode = menuEl.children[itemIdx - 1];
                        newNode.focus();
                    }
                    break;
                }
                case 'arrowdown': {
                    this.containerEl.classList.add(CLASS_ELEM_KEYBOARD_FOCUS);
                    if (itemIdx >= 0 && itemIdx < menuEl.children.length - 1) {
                        const newNode = menuEl.children[itemIdx + 1];
                        newNode.focus();
                    }
                    break;
                }
                case 'arrowleft': {
                    if (itemIdx >= 0 && !menuEl.children[itemIdx].classList.contains('bp-media-settings-item')) {
                        // Go back to the main menu
                        this.reset();
                        this.firstMenuItem.focus();
                    }
                    break;
                }
                case 'arrowright': {
                    if (itemIdx >= 0) {
                        const curNode = menuEl.children[itemIdx];
                        if (curNode.classList.contains('bp-media-settings-item')) {
                            if (curNode.getAttribute('data-type') === 'speed') {
                                this.showSubMenu('speed');
                            } else if (curNode.getAttribute('data-type') === 'quality') {
                                this.showSubMenu('quality');
                            }
                        }
                    }
                    break;
                }
                case 'escape': {
                    this.hide();
                    this.settingsButtonEl.focus();
                    break;
                }
                default: {
                    return;
                }
            }
            event.preventDefault();
            event.stopPropagation();
        }

        // For key-presses, consume the event and stop propragation
        if (event.type === 'keydown') {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    /**
     * Handles option selection
     *
     * @param {string} type - of menu option
     * @param {string} value - of menu option
     * @return {void}
     */
    chooseOption(type, value) {
        // Save the value
        cache.set(`media-${type}`, value);

        // Emit to the listener what was chosen
        this.emit(type);

        // Figure out the target option
        const option = this.settingsEl.querySelector(`[data-type="${type}"][data-value="${value}"]`);

        // Fetch the menu label to use
        const label = option.querySelector(SELECTOR_SETTINGS_VALUE).textContent;

        // Copy the value of the selected option to the main top level menu
        this.settingsEl.querySelector(`[data-type="${type}"] ${SELECTOR_SETTINGS_VALUE}`).textContent = label;

        // Remove the checkmark from the prior selected option in the sub menu
        const prevSelected = this.settingsEl.querySelector(`[data-type="${type}"]${SELECTOR_SETTINGS_SUB_ITEM}.${CLASS_SETTINGS_SELECTED}`);
        prevSelected.classList.remove(CLASS_SETTINGS_SELECTED);
        prevSelected.removeAttribute('aria-checked');

        // Add a checkmark to the new selected option in the sub menu
        option.classList.add(CLASS_SETTINGS_SELECTED);
        option.setAttribute('aria-checked', 'true');

        // Return to main menu
        this.reset();
        this.firstMenuItem.focus();
    }

    /**
     * Handles blur of the menu
     *
     * @private
     * @param {Event} event - click event
     * @return {void}
     */
    blurHandler(event) {
        // If event happened outside the settings menu, check for escape key
        if (!this.settingsEl.contains(event.target)) {
            const key = decodeKeydown(event);
            if (key === 'Escape') {
                this.hide();
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            // Only if event happened outside the settings button as well, hide on click/space/enter; we ignore
            // settings button here because it has its own handler for this event
            if (!this.settingsButtonEl.contains(event.target) && (event.type === 'click' || key === 'Space' || key === 'Enter')) {
                this.hide();
            }
        }
    }

    /**
     * Getter for the value of visible
     *
     * @public
     * @return {boolean} Whether the settings menu is open (visible) or not
     */
    isVisible() {
        return this.visible;
    }

    /**
     * Shows the menu
     *
     * @public
     * @return {void}
     */
    show() {
        this.visible = true;
        this.containerEl.classList.add(CLASS_SETTINGS_OPEN);
        this.firstMenuItem.focus();

        document.addEventListener('click', this.blurHandler, true);
        document.addEventListener('keydown', this.blurHandler, true);
    }

    /**
     * Hides the menu
     *
     * @public
     * @return {void}
     */
    hide() {
        this.reset();
        this.containerEl.classList.remove(CLASS_SETTINGS_OPEN);
        this.visible = false;
        document.removeEventListener('click', this.blurHandler, true);
        document.removeEventListener('keydown', this.blurHandler, true);
    }
}

export default Settings;
