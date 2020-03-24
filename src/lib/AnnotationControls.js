import noop from 'lodash/noop';
import { ICON_REGION_COMMENT } from './icons/icons';
import Controls, { CLASS_BOX_CONTROLS_GROUP_BUTTON } from './Controls';

const CLASS_ANNOTATIONS_GROUP = 'bp-annotations-group';
const CLASS_REGION_COMMENT_BUTTON = 'bp-region-comment-btn';
const CLASS_BUTTON_ACTIVE = 'active';

class AnnotationControls {
    /** @property {Controls} - Controls object */
    controls;

    /** @property {Boolean} - Region comment mode active state */
    isRegionCommentActive = false;

    /** @property {HTMLElement} - Region comment button element */
    regionCommentButtonElement;

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

    handleRegionCommentClick = onRegionCommentClick => event => {
        this.isRegionCommentActive = !this.isRegionCommentActive;
        if (this.isRegionCommentActive) {
            this.regionCommentButtonElement.classList.add(CLASS_BUTTON_ACTIVE);
        } else {
            this.regionCommentButtonElement.classList.remove(CLASS_BUTTON_ACTIVE);
        }

        onRegionCommentClick({ isRegionCommentActive: this.isRegionCommentActive, event });
    };

    /**
     * Initialize the annotation controls with options.
     *
     * @param {Function} [options.onRegionCommentClick] - Callback when region comment button is clicked
     * @return {void}
     */
    init({ onRegionCommentClick = noop } = {}) {
        const groupElement = this.controls.addGroup(CLASS_ANNOTATIONS_GROUP);
        this.regionCommentButtonElement = this.controls.add(
            __('region_comment'),
            this.handleRegionCommentClick(onRegionCommentClick),
            `${CLASS_BOX_CONTROLS_GROUP_BUTTON} ${CLASS_REGION_COMMENT_BUTTON}`,
            ICON_REGION_COMMENT,
            'button',
            groupElement,
        );
    }
}

export default AnnotationControls;
