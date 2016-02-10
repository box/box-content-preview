'use strict';

import Box3DControls from '../box3d-controls';
import autobind from 'autobind-decorator';
import {EVENT_SET_RENDER_MODE} from './model3d-constants';
const CSS_CLASS_HIDDEN = 'box-preview-is-hidden';
const CSS_CLASS_CURRENT_RENDER_MODE = 'box-preview-current-render-mode';

const RENDER_MODES = {
    lit: {
        name: 'Lit',
        key: 'lit',
        baseClass: 'lit', // add rm- for control, and icon-rm, and .rm- for query selector
        el: null
    },
    unlit: {
        name: 'Unlit',
        key: 'unlit',
        baseClass: 'unlit',
        el: null
    },
    normals: {
        name: 'Normals',
        key: 'normals',
        baseClass: 'normals',
        el: null
    },
    wireframe: {
        name: 'Wireframe',
        key: 'wireframe',
        baseClass: 'wireframe',
        el: null
    },
    flatwire: {
        name: 'Untextured Wireframe',
        key: 'flatwire',
        baseClass: 'untexturedwireframe',
        el: null
    },
    uv: {
        name: 'UV Overlay',
        key: 'uv',
        baseClass: 'uvoverlay',
        el: null
    }
};


/**
 * Model3dControls
 * This class handles the UI for 3d preview controls. This includes Reset,
 * Render Mode selection, VR and fullscreen buttons.
 * @class
 */
@autobind
class Model3dControls extends Box3DControls  {
    /**
     * Creates UI and Handles events for 3D Model Preview
     * @constructor
     * @inheritdoc
     * @returns {Model3dControls} Model3dControls instance
     */
    constructor(containerEl) {
        super(containerEl);
        this.renderModeCurrent = RENDER_MODES.lit.name;
    }

    /**
     * @inheritdoc
     */
    addUi() {
        super.addUi();

        this.renderModesSelectorEl = document.createElement('ul');
        this.renderModesSelectorEl.classList.add('box-preview-overlay',
            'box-preview-pullup', 'box-preview-render-mode-selector', CSS_CLASS_HIDDEN);

        Object.keys(RENDER_MODES).forEach((mode) => {
            const renderModeEl = this.createRenderModeItem(RENDER_MODES[mode]);
            this.renderModesSelectorEl.appendChild(renderModeEl);
        });

        const renderModesEl = this.controls.add(__('render mode'), this.handleToggleRenderModes, 'box-preview-rendermodes-icon');
        renderModesEl.parentElement.appendChild(this.renderModesSelectorEl);


        // Set default to lit!
        this.handleSetRenderMode(RENDER_MODES.lit);
    }

    /**
     * Create a render mode selector for the render mode controls
     * @param {Object} renderModeDescriptor Description of render mode data. See RENDER_MODES
     * @returns {HTMLElement} The built render mode item to add to render modes list UI
     */
    createRenderModeItem(renderModeDescriptor) {

        const className = renderModeDescriptor.baseClass;

        const renderModeItem = document.createElement('li');
        renderModeItem.classList.add('box-preview-rm-' + className, 'box-preview-rendermode-item');
        renderModeDescriptor.el = renderModeItem;

        const onRenderModeChange = this.handleSetRenderMode.bind(this, renderModeDescriptor);

        this.registerUiItem(className, renderModeItem, 'click', onRenderModeChange);

        const renderModeIcon = document.createElement('span');
        renderModeIcon.classList.add('box-preview-icon-rm-' + className, 'box-preview-inline-icon');

        renderModeItem.appendChild(renderModeIcon);
        renderModeItem.innerHTML += renderModeDescriptor.name;

        return renderModeItem;
    }

    /**
     * Handle toggle rendermodes ui event
     * @returns {void}
     */
    handleToggleRenderModes() {
        this.toggleElementVisibility(this.renderModesSelectorEl);
    }

    /**
     * Handle a change of render mode
     * @param {object} renderMode A render mode descriptor, used to set the current
     * render mode icon, and send an event
     * @returns {void}
     */
    handleSetRenderMode(renderMode) {
        const current = this.renderModesSelectorEl.querySelector('.' + CSS_CLASS_CURRENT_RENDER_MODE);
        if (current) {
            current.classList.remove(CSS_CLASS_CURRENT_RENDER_MODE);
        }
        renderMode.el.classList.add(CSS_CLASS_CURRENT_RENDER_MODE);
        this.renderModeCurrent = renderMode.key;
        this.emit(EVENT_SET_RENDER_MODE, renderMode.name);
    }

    /**
     * @inheritdoc
     */
    handleReset() {
        super.handleReset();
        // Reset the render mode to the default render mode of this preview.
        this.handleSetRenderMode(RENDER_MODES.lit);
    }

    /**
     * Set a the render mode, from a key in the Render Modes dictionary
     * @param {string} modeIcon The key in the RENDER_MODES dictionary to use to
     * get the icon class that we'll change the render mode button to
     * @returns {void}
     */
    setRenderModeUI(modeIcon) {
        let icon = this.renderModeControl.querySelector('span');
        icon.className = modeIcon;
    }
}

export default Model3dControls;
