import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, Root } from 'react-dom/client';
import { Button, InlineNotice } from '@box/blueprint-web';
import BlueprintProviders from '../../BlueprintProviders';

type Props = {
    onDownload: () => void;
};

export default function TruncatedTextNoticeV2({ onDownload }: Props): JSX.Element {
    return (
        <>
            <InlineNotice variant="info" variantIconAriaLabel={__('notice_info')}>
                {__('text_truncated')}
            </InlineNotice>
            <Button
                className="bp-TruncatedTextNoticeV2-download"
                data-resin-target="downloadTruncatedFile"
                data-target-id="TruncatedTextNotice-download"
                onClick={onDownload}
                variant="primary"
            >
                {__('download_file')}
            </Button>
        </>
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
