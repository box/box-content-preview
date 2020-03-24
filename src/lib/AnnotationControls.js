import noop from 'lodash/noop';
import { ICON_REGION_COMMENT } from './icons/icons';
import Controls, { CLASS_BOX_CONTROLS_GROUP_BUTTON } from './Controls';

const CLASS_ANNOTATIONS_GROUP = 'bp-annotations-group';
const CLASS_REGION_BUTTON = 'bp-region-btn';
const CLASS_BUTTON_ACTIVE = 'active';

class AnnotationControls {
    /** @property {Controls} - Controls object */
    controls;

    /** @property {Boolean} - Region comment mode active state */
    isRegionActive = false;

    /** @property {HTMLElement} - Region comment button element */
    regionButtonElement;

    /**
     * [constructor]
     *
     * @param {Controls} controls - Viewer controls
     * @return {AnnotationControls} Instance of AnnotationControls
     */
    constructor(controls) {
        if (!controls || !(controls instanceof Controls)) {
            throw Error('controls must be an instance of Controls');
        }

        this.controls = controls;
    }

    handleRegionClick = onRegionClick => event => {
        this.isRegionActive = !this.isRegionActive;
        if (this.isRegionActive) {
            this.regionButtonElement.classList.add(CLASS_BUTTON_ACTIVE);
        } else {
            this.regionButtonElement.classList.remove(CLASS_BUTTON_ACTIVE);
        }

        onRegionClick({ isRegionActive: this.isRegionActive, event });
    };

    /**
     * Initialize the annotation controls with options.
     *
     * @param {Function} [options.onRegionClick] - Callback when region comment button is clicked
     * @return {void}
     */
    init({ onRegionClick = noop } = {}) {
        const groupElement = this.controls.addGroup(CLASS_ANNOTATIONS_GROUP);
        this.regionButtonElement = this.controls.add(
            __('region_comment'),
            this.handleRegionClick(onRegionClick),
            `${CLASS_BOX_CONTROLS_GROUP_BUTTON} ${CLASS_REGION_BUTTON}`,
            ICON_REGION_COMMENT,
            'button',
            groupElement,
        );
    }
}

export default AnnotationControls;
