import DocumentViewer from './DocumentViewer';
import { METADATA } from '../../constants';
import { MISSING_EXTERNAL_REFS } from '../../events';

const { FIELD_HASXREFS, TEMPLATE_AUTOCAD } = METADATA;

class AutoCADViewer extends DocumentViewer {
    constructor(options) {
        super(options);
        this.api = options.api;
    }

    /**
     * @inheritdoc
     */
    load() {
        super.load();

        this.checkForXrefs();
    }

    /**
     * Checks for xrefs, depending on file extension
     * @return {void}
     */
    checkForXrefs() {
        const { extension, id } = this.options.file;

        this.api.metadata
            .getXrefsMetadata(id, TEMPLATE_AUTOCAD, this.options)
            .then(({ [FIELD_HASXREFS]: hasxrefsValue }) => {
                if (hasxrefsValue) {
                    this.options.ui.showNotification(__('has_x_refs'), null, true);

                    this.emitMetric({
                        name: MISSING_EXTERNAL_REFS,
                        data: extension,
                    });
                }
            });
    }
}

export default AutoCADViewer;
