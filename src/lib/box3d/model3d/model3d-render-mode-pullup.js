import EventEmitter from 'events';
import { UIRegistry, createPullup, createRow } from '../box3d-ui-utils';
import { ICON_CHECK_MARK } from '../../icons/icons';
import { EVENT_SET_RENDER_MODE } from './model3d-constants';
import { CLASS_HIDDEN } from '../../constants';

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
    shape: {
        name: 'Shape',
        key: 'shape',
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
 * Handles the creation of ui and events for the Render Mode Pullup, seen in Model3dControls
 * @class
 */
export default class Model3DRenderModePullup extends EventEmitter {

    /**
     * @constructor
     */
    constructor() {
        super();

        this.renderModesSelectorEl = null;

        this.uiRegistry = new UIRegistry();
        this.pullupEl = this.createUi();
    }

    /**
     * Creare the UI Necessary to run the render mode pullup
     * @returns {HTMLElement} The pullup with the render mode items
     */
    createUi() {
        const renderModesSelectorEl = createPullup();
        renderModesSelectorEl.classList.add('box-preview-render-mode-selector');
        this.renderModesSelectorEl = renderModesSelectorEl;

        const renderModelTitleEl = createRow('RENDER MODE');
        renderModesSelectorEl.appendChild(renderModelTitleEl);

        Object.keys(RENDER_MODES).forEach((mode) => {
            const renderModeEl = this.createRenderModeItem(RENDER_MODES[mode]);
            renderModesSelectorEl.appendChild(renderModeEl);
        });

        return renderModesSelectorEl;
    }

    /**
     * Create a render mode selector for the render mode controls
     * @param {Object} renderModeDescriptor Description of render mode data. See RENDER_MODES
     * @returns {HTMLElement} The built render mode item to add to render modes list UI
     */
    createRenderModeItem(renderModeDescriptor) {
        const className = renderModeDescriptor.baseClass;

        const renderModeItem = document.createElement('li');
        renderModeItem.classList.add(`box-preview-rm-${className}`);
        renderModeItem.classList.add('box-preview-rendermode-item');

        const renderModeIcon = document.createElement('span');
        renderModeIcon.classList.add('box-preview-inline-icon');
        renderModeIcon.innerHTML = ICON_CHECK_MARK;

        renderModeItem.appendChild(renderModeIcon);

        /*eslint-disable*/
        renderModeDescriptor.el = renderModeItem;
        /*eslint-enable*/
        const onRenderModeChange = () => {
            this.renderModesSelectorEl.classList.add(CLASS_HIDDEN);
            this.setRenderMode(renderModeDescriptor);
        };

        this.uiRegistry.registerUiItem(className, renderModeItem, 'click', onRenderModeChange);

        renderModeItem.innerHTML += renderModeDescriptor.name;

        return renderModeItem;
    }

    /**
     * Handle a change of render mode
     * @param {object} renderMode A render mode descriptor, used to set the current
     * render mode icon, and send an event
     * @returns {void}
     */
    setRenderMode(renderMode = 'Lit') {
        const current = this.renderModesSelectorEl.querySelector(`.${CSS_CLASS_CURRENT_RENDER_MODE}`);
        if (current) {
            current.classList.remove(CSS_CLASS_CURRENT_RENDER_MODE);
        }

        let mode = renderMode;
        // In the case the render mode name is passed, we'll use it to get the
        // corresponding render mode info
        if (typeof mode === 'string') {
            mode = this.getModeByName(renderMode);
        }

        mode.el.classList.add(CSS_CLASS_CURRENT_RENDER_MODE);
        this.renderModeCurrent = mode.key;
        this.emit(EVENT_SET_RENDER_MODE, mode.name);
    }

    /**
     * Given a render mode name, get the corresponding render mode info
     * @param {String} renderModeName The name of the render mode
     * @returns {Object} Render mode descriptor
     */
    getModeByName(renderModeName) {
        let renderMode;

        /* eslint-disable no-restricted-syntax */
        for (const renderModeKey in RENDER_MODES) {
            if (RENDER_MODES.hasOwnProperty(renderModeKey)) {
                const renderModeDesc = RENDER_MODES[renderModeKey];
                if (renderModeDesc.name === renderModeName) {
                    renderMode = renderModeDesc;
                    break;
                }
            }
        }
        /* eslint-enable no-restricted-syntax */

        return renderMode;
    }

    /**
     * Unregister all ui pieces!
     * @returns {void}
     */
    destroy() {
        this.uiRegistry.unregisterUiItems();
        this.uiRegistry = null;
        this.renderModesSelectorEl = null;
        this.pullupEl = null;
    }
}
