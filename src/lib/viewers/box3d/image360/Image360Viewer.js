import React from 'react';
import Box3DViewer from '../Box3DViewer';
import Box3DControls from '../Box3DControls';
import ControlsRoot from '../../controls/controls-root';
import Image360Controls from './Image360Controls';
import Image360Renderer from './Image360Renderer';
import './Image360.scss';

const CSS_CLASS_IMAGE_360 = 'bp-image-360';
const LOAD_TIMEOUT = 120000;

class Image360Viewer extends Box3DViewer {
    /**
     * @inheritdoc
     */
    setup() {
        if (this.isSetup) {
            return;
        }

        // Call super() to set up common layout
        super.setup();

        this.wrapperEl.classList.add(CSS_CLASS_IMAGE_360);

        // Override timeout as we're often downloading the original representation
        // to ensure that we get the maximum resolution image. On a 3G connection,
        // the default 15 seconds is often not enough.
        this.loadTimeout = LOAD_TIMEOUT;
    }

    /**
     * @inheritdoc
     */
    createSubModules() {
        this.controls = this.getViewerOption('useReactControls')
            ? new ControlsRoot({ containerEl: this.wrapperEl, fileId: this.options.file.id })
            : new Box3DControls(this.wrapperEl);
        this.renderer = new Image360Renderer(this.wrapperEl, this.boxSdk, { api: this.api });
    }

    /**
     * @inheritdoc
     */
    handleSceneLoaded() {
        super.handleSceneLoaded();

        if (this.getViewerOption('useReactControls')) {
            this.renderUI();
        }
    }

    /**
     * @inheritdoc
     */
    handleShowVrButton() {
        if (!this.controls) {
            return;
        }

        if (this.getViewerOption('useReactControls')) {
            this.showVrButton = true;
            this.renderUI();
        } else {
            this.controls.showVrButton();
        }
    }

    renderUI() {
        if (!this.controls) {
            return;
        }

        this.controls.render(
            <Image360Controls
                isVrShown={this.showVrButton}
                onFullscreenToggle={this.toggleFullscreen}
                onVrToggle={this.handleToggleVr}
            />,
        );
    }
}

export default Image360Viewer;
