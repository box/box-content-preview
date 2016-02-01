'use strict';

import Box3DControls from '../box3d-controls';
import autobind from 'autobind-decorator';
import {EVENT_SET_RENDER_MODE} from './model3d-constants';
import {CSS_CLASS_HIDDEN} from '../box3d-constants';

const CSS_CLASS_CURRENT_RENDER_MODE = 'current-render-mode';
const RENDER_MODES = {
    lit: {
        name: 'Lit',
        key: 'lit',
        icon: 'icon-rm-lit',
        renderMode: 'Lit',
        elQuery: '.rm-lit',//class associated with the unique menu item  rmunlit rm-normals rm-wireframe rm-untexturedwireframe rm-uvoverlay
        el: null
    },
    unlit: {
        name: 'Unlit',
        key: 'unlit',
        icon: 'icon-rm-unlit',
        renderMode: 'Unlit',
        elQuery: '.rm-unlit',
        el: null
    },
    normals: {
        name: 'Normals',
        key: 'normals',
        icon: 'icon-rm-normals',
        renderMode: 'Normals',
        elQuery: '.rm-normals',
        el: null
    },
    wireframe: {
        name: 'Wireframe',
        key: 'wireframe',
        icon: 'icon-rm-wireframe',
        renderMode: 'Wireframe',
        elQuery: '.rm-wireframe',
        el: null
    },
    flatwire: {
        name: 'Untextured Wireframe',
        key: 'flatwire',
        icon: 'icon-rm-untexturedwireframe',
        renderMode: 'Untextured Wireframe',
        elQuery: '.rm-untexturedwireframe',
        el: null
    },
    uv: {
        name: 'UV Overlay',
        key: 'uv',
        icon: 'icon-rm-uvoverlay',
        renderMode: 'UV Overlay',
        elQuery: '.rm-uvoverlay',
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
     * [constructor]
     * @param {HTMLElement} containerEl the container element
     * @returns {Model3dControls} Model3dControls instance
     */
    constructor(containerEl) {
        super(containerEl);

        this.renderModeCurrent = RENDER_MODES.lit.name;

        this.renderModesSelectorEl = this.el.querySelector('.render-mode-selector');

    }

    /**
     * Create and add all UI to the Preview, here
     * @returns {void}
     */
    addUi() {
        super.addUi();

        this.renderModesSelectorEl = document.createElement('ul');
        this.renderModesSelectorEl.classList.add('preview-overlay', 'preview-pullup', 'render-mode-selector', CSS_CLASS_HIDDEN);

        let renderModeLit = this.createRenderModeItem('rm-lit', RENDER_MODES.lit);
        this.renderModesSelectorEl.appendChild(renderModeLit);
        renderModeLit.classList.add(CSS_CLASS_CURRENT_RENDER_MODE);

        renderModeLit = this.createRenderModeItem('rm-unlit', RENDER_MODES.unlit);
        this.renderModesSelectorEl.appendChild(renderModeLit);

        renderModeLit = this.createRenderModeItem('rm-normals', RENDER_MODES.normals);
        this.renderModesSelectorEl.appendChild(renderModeLit);

        renderModeLit = this.createRenderModeItem('rm-wireframe', RENDER_MODES.wireframe);
        this.renderModesSelectorEl.appendChild(renderModeLit);

        renderModeLit = this.createRenderModeItem('rm-untexturedwireframe', RENDER_MODES.flatwire);
        this.renderModesSelectorEl.appendChild(renderModeLit);

        renderModeLit = this.createRenderModeItem('rm-uvoverlay', RENDER_MODES.uv);
        this.renderModesSelectorEl.appendChild(renderModeLit);

        this.renderModeControl = this.createControlItem('icon-rendermodes',
            this.handleToggleRenderModes.bind(this), this.renderModesSelectorEl);
        this.controlBar.appendChild(this.renderModeControl);
    }

    /**
     * Create a render mode selector for the render mode controls
     * @param {string} className The class name to attach to the created element,
     * and to build icons from
     * @param {Object} renderModeDescriptor Description of render mode data. See RENDER_MODES
     * @returns {HtmlElement} The built render mode item to add to render modes list UI
     */
    createRenderModeItem(className, renderModeDescriptor) {

        let renderModeItem = document.createElement('li');
        renderModeItem.classList.add(className, 'rendermode-item');
        renderModeDescriptor.el = renderModeItem;

        let onRenderModeChange = this.handleSetRenderMode.bind(this, renderModeDescriptor);

        this.registerUiItem(className, renderModeItem, 'click', onRenderModeChange);

        let renderModeIcon = document.createElement('span');
        renderModeIcon.classList.add('icon-' + className, 'inline-icon');

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
     * [handleSetRenderMode description]
     * @param {[type]} renderMode [description]
     * @returns {[type]} [description]
     */
    handleSetRenderMode(renderMode) {
        let current = this.renderModeControl.querySelector('.' + CSS_CLASS_CURRENT_RENDER_MODE);
        if (current) {
            current.classList.remove(CSS_CLASS_CURRENT_RENDER_MODE);
        }
        renderMode.el.classList.add(CSS_CLASS_CURRENT_RENDER_MODE);
        this.renderModeCurrent = renderMode.key;
        this.emit(EVENT_SET_RENDER_MODE, renderMode.name);

        this.setRenderModeUI(renderMode.icon);
    }

    /**
     * Handles the reset event
     * @returns {void}
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
