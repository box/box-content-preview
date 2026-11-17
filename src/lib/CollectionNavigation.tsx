import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import ChevronLeft from '@box/blueprint-web-assets/icons/Medium/ChevronLeft';
import ChevronRight from '@box/blueprint-web-assets/icons/Medium/ChevronRight';
import { IconButton, Tooltip } from '@box/blueprint-web';
import BlueprintProviders from './BlueprintProviders';
import './CollectionNavigation.scss';

// Hosts with their own arrows, like box-ui-elements ContentPreview, hide `.bp-navigate`.
const ARROW_CLASS_NAME = 'bp-navigate bp-CollectionNavigation-arrow';

type Props = {
    hasNext: boolean;
    hasPrevious: boolean;
    onNext: () => void;
    onPrevious: () => void;
};

export default function CollectionNavigation({ hasNext, hasPrevious, onNext, onPrevious }: Props): JSX.Element {
    return (
        <>
            {hasPrevious && (
                <div className={`${ARROW_CLASS_NAME} bp-CollectionNavigation-previous`}>
                    <Tooltip content={__('previous_file')}>
                        <IconButton
                            aria-label={__('previous_file')}
                            data-target-id="CollectionNavigation-previous"
                            icon={ChevronLeft}
                            onClick={onPrevious}
                            size="large"
                            variant="high-contrast"
                        />
                    </Tooltip>
                </div>
            )}
            {hasNext && (
                <div className={`${ARROW_CLASS_NAME} bp-CollectionNavigation-next`}>
                    <Tooltip content={__('next_file')}>
                        <IconButton
                            aria-label={__('next_file')}
                            data-target-id="CollectionNavigation-next"
                            icon={ChevronRight}
                            onClick={onNext}
                            size="large"
                            variant="high-contrast"
                        />
                    </Tooltip>
                </div>
            )}
        </>
    );
}

export type CollectionNavigationState = Pick<Props, 'hasNext' | 'hasPrevious'>;

export type Options = Pick<Props, 'onNext' | 'onPrevious'> & {
    containerEl: HTMLElement;
};

export class CollectionNavigationRoot {
    containerEl: HTMLElement;

    hostEl: HTMLElement;

    isDestroyed = false;

    onNext: () => void;

    onPrevious: () => void;

    root: Root;

    constructor({ containerEl, onNext, onPrevious }: Options) {
        this.containerEl = containerEl;
        this.onNext = onNext;
        this.onPrevious = onPrevious;
        this.hostEl = document.createElement('div');
        this.hostEl.className = 'bp-CollectionNavigationRoot';
        containerEl.appendChild(this.hostEl);
        this.root = createRoot(this.hostEl);
    }

    destroy(): void {
        this.isDestroyed = true;
        this.root.unmount();
        this.hostEl.remove();
    }

    render({ hasNext, hasPrevious }: CollectionNavigationState): void {
        if (this.isDestroyed) {
            return;
        }

        this.root.render(
            <BlueprintProviders container={this.hostEl}>
                <CollectionNavigation
                    hasNext={hasNext}
                    hasPrevious={hasPrevious}
                    onNext={this.onNext}
                    onPrevious={this.onPrevious}
                />
            </BlueprintProviders>,
        );
    }
}
