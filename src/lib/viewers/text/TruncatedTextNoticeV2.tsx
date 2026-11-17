import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, Root } from 'react-dom/client';
import { ActionableInlineNotice } from '@box/blueprint-web';
import InformationCircle from '@box/blueprint-web-assets/icons/Medium/InformationCircle';
import BlueprintProviders from '../../BlueprintProviders';

type Props = {
    onDownload: () => void;
};

export default function TruncatedTextNoticeV2({ onDownload }: Props): JSX.Element {
    return (
        <ActionableInlineNotice
            enableContainerQueryLayout
            icon={InformationCircle}
            iconAriaLabel={__('notice_info')}
            text={__('text_truncated')}
        >
            <ActionableInlineNotice.PrimaryAction
                className="bp-TruncatedTextNoticeV2-download"
                data-resin-target="downloadTruncatedFile"
                data-target-id="TruncatedTextNotice-download"
                onClick={onDownload}
            >
                {__('download_file')}
            </ActionableInlineNotice.PrimaryAction>
        </ActionableInlineNotice>
    );
}

export class TruncatedTextNoticeV2Root {
    hostEl: HTMLElement;

    root: Root;

    constructor(containerEl: HTMLElement, onDownload: () => void) {
        this.hostEl = document.createElement('div');
        this.hostEl.className = 'bp-TruncatedTextNoticeV2';
        this.hostEl.setAttribute('data-resin-feature', 'truncatedText');
        containerEl.appendChild(this.hostEl);
        this.root = createRoot(this.hostEl);
        flushSync(() => {
            this.root.render(
                <BlueprintProviders>
                    <TruncatedTextNoticeV2 onDownload={onDownload} />
                </BlueprintProviders>,
            );
        });
    }

    destroy(): void {
        this.root.unmount();
        this.hostEl.remove();
    }
}
