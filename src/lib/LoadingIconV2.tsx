import React from 'react';
import classNames from 'classnames';
import { createRoot, Root } from 'react-dom/client';

import { bpBoxBlue100 } from '@box/blueprint-web-assets/tokens/tokens';
import { FILE_CATEGORY_COLORS, getFileCategoryByExtension, ItemIcon } from '@box/item-icon';

import type { FileCategory } from '@box/item-icon';

import './LoadingIconV2.scss';

type Props = {
    extension?: string;
};

const isFileCategory = (category: string): category is FileCategory =>
    Object.prototype.hasOwnProperty.call(FILE_CATEGORY_COLORS, category);

export const LoadingIconV2 = ({ extension }: Props): JSX.Element => {
    const category = getFileCategoryByExtension(extension?.toLowerCase());
    const ringColor = isFileCategory(category) ? FILE_CATEGORY_COLORS[category] : bpBoxBlue100;
    // Video files are displayed on a dark background
    const theme = category === 'video' ? 'dark' : 'light';

    return (
        <div
            aria-label={__('loading_preview')}
            className={classNames('bp-LoadingIconV2', `bp-LoadingIconV2--${theme}`)}
            role="progressbar"
        >
            <div
                className="bp-LoadingIconV2-ring"
                style={{ '--bp-loading-icon-ring-color': ringColor } as React.CSSProperties}
            />
            <div className="bp-LoadingIconV2-content">
                <ItemIcon ariaHidden className="bp-LoadingIconV2-icon" iconType={category} />
            </div>
        </div>
    );
};

export type Options = {
    containerEl: HTMLElement;
};

export class LoadingIconV2Root {
    root: Root;

    constructor({ containerEl }: Options) {
        this.root = createRoot(containerEl);
    }

    destroy(): void {
        this.root.unmount();
    }

    render(extension?: string): void {
        this.root.render(<LoadingIconV2 extension={extension} />);
    }
}
