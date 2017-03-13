import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import cache from '../../Cache';
import { insertTemplate } from '../../util';
import { ICON_ARROW_LEFT, ICON_ARROW_RIGHT, ICON_CHECK_MARK } from '../../icons/icons';

const CLASS_SETTINGS = 'bp-media-settings';
const CLASS_SETTINGS_SELECTED = 'bp-media-settings-selected';
const CLASS_SETTINGS_OPEN = 'bp-media-settings-is-open';
const SELECTOR_SETTINGS_SUB_ITEM = '.bp-media-settings-sub-item';
const SELECTOR_SETTINGS_VALUE = '.bp-media-settings-value';

const SETTINGS_TEMPLATE = `<div class="bp-media-settings">
    <div class="bp-media-settings-item bp-media-settings-item-speed" data-type="speed">
        <div class="bp-media-settings-label">${__('media_speed')}</div>
        <div class="bp-media-settings-value">${__('media_speed_normal')}</div>
        <div class="bp-media-settings-arrow">${ICON_ARROW_RIGHT}</div>
    </div>
    <div class="bp-media-settings-item bp-media-settings-item-quality" data-type="quality">
        <div class="bp-media-settings-label">${__('media_quality')}</div>
        <div class="bp-media-settings-value">${__('media_quality_auto')}</div>
        <div class="bp-media-settings-arrow">${ICON_ARROW_RIGHT}</div>
    </div>
    <div class="bp-media-settings-sub-item bp-media-settings-options-speed bp-media-settings-sub-item-speed" data-type="menu">
        <div class="bp-media-settings-arrow">${ICON_ARROW_LEFT}</div>
        <div class="bp-media-settings-label">${__('media_speed')}</div>
    </div>
    <div class="bp-media-settings-sub-item bp-media-settings-options-speed" data-type="speed" data-value="0.25">
        <div class="bp-media-settings-icon">${ICON_CHECK_MARK}</div>
        <div class="bp-media-settings-value">0.25</div>
    </div>
    <div class="bp-media-settings-sub-item bp-media-settings-options-speed" data-type="speed" data-value="0.5">
        <div class="bp-media-settings-icon">${ICON_CHECK_MARK}</div>
        <div class="bp-media-settings-value">0.5</div>
    </div>
    <div class="bp-media-settings-sub-item bp-media-settings-options-speed bp-media-settings-selected" data-type="speed" data-value="1.0">
        <div class="bp-media-settings-icon">${ICON_CHECK_MARK}</div>
        <div class="bp-media-settings-value">${__('media_speed_normal')}</div>
    </div>
    <div class="bp-media-settings-sub-item bp-media-settings-options-speed" data-type="speed" data-value="1.25">
        <div class="bp-media-settings-icon">${ICON_CHECK_MARK}</div>
        <div class="bp-media-settings-value">1.25</div>
    </div>
    <div class="bp-media-settings-sub-item bp-media-settings-options-speed" data-type="speed" data-value="1.5">
        <div class="bp-media-settings-icon">${ICON_CHECK_MARK}</div>
        <div class="bp-media-settings-value">1.5</div>
    </div>
    <div class="bp-media-settings-sub-item bp-media-settings-options-speed" data-type="speed" data-value="2.0">
        <div class="bp-media-settings-icon">${ICON_CHECK_MARK}</div>
        <div class="bp-media-settings-value">2.0</div>
    </div>
    <div class="bp-media-settings-sub-item bp-media-settings-options-quality bp-media-settings-sub-item-quality" data-type="menu">
        <div class="bp-media-settings-arrow">${ICON_ARROW_LEFT}</div>
        <div class="bp-media-settings-label">${__('media_quality')}</div>
    </div>
    <div class="bp-media-settings-sub-item bp-media-settings-options-quality" data-type="quality" data-value="sd">
        <div class="bp-media-settings-icon">${ICON_CHECK_MARK}</div>
        <div class="bp-media-settings-value">480p</div>
    </div>
    <div class="bp-media-settings-sub-item bp-media-settings-options-quality" data-type="quality" data-value="hd">
        <div class="bp-media-settings-icon">${ICON_CHECK_MARK}</div>
        <div class="bp-media-settings-value">1080p</div>
    </div>
    <div class="bp-media-settings-sub-item bp-media-settings-options-quality bp-media-settings-selected" data-type="quality" data-value="auto">
        <div class="bp-media-settings-icon">${ICON_CHECK_MARK}</div>
        <div class="bp-media-settings-value">${__('media_quality_auto')}</div>
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

        insertTemplate(this.containerEl, SETTINGS_TEMPLATE);

        this.settingsEl = this.containerEl.lastElementChild;
        this.settingsEl.addEventListener('click', this.menuClickHandler);
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
            this.settingsEl.removeEventListener('click', this.menuClickHandler);
        }
        document.removeEventListener('click', this.blurHandler);
    }

    /**
     * [destructor]
     * @return {void}
     */
    reset() {
        this.settingsEl.className = CLASS_SETTINGS;
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
     * Extracts info out of the click target
     *
     * @param {Event} event - click event
     * @return {void}
     */
    menuClickHandler(event) {
        // Extract the parent target dataset element
        const target = this.findParentDataType(event.target);
        if (!target) {
            return;
        }

        const type = target.getAttribute('data-type');
        const value = target.getAttribute('data-value');

        if (type === 'menu') {
            // We are in the sub menu and going back to the main menu
            this.reset();
        } else if (type && value) {
            // We are in the sub-menu and clicked a valid option
            this.chooseOption(type, value);
        } else if (type) {
            // We are in the main menu and clicked a valid option
            this.settingsEl.classList.add(`bp-media-settings-show-${type}`);
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
        // Hide the menu
        this.hide();

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
        this.settingsEl.querySelector(`[data-type="${type}"]${SELECTOR_SETTINGS_SUB_ITEM}.${CLASS_SETTINGS_SELECTED}`).classList.remove(CLASS_SETTINGS_SELECTED);

        // Add a checkmark to the new selected option in the sub menu
        option.classList.add(CLASS_SETTINGS_SELECTED);
    }

    /**
     * Handles blur of the menu
     *
     * @private
     * @param {Event} event - click event
     * @return {void}
     */
    blurHandler(event) {
        if (!this.settingsEl.contains(event.target)) {
            this.hide();
        }
    }

    /**
     * Getter for the value of quality
     *
     * @public
     * @return {string} The quality
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

        // Asynchronously add a blur handler.
        // Needs to be async so that event is not caught on bubble when bp-media-settings icon is clicked
        setTimeout(() => {
            document.addEventListener('click', this.blurHandler);
        }, 0);
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
        document.removeEventListener('click', this.blurHandler);
    }
}

export default Settings;
