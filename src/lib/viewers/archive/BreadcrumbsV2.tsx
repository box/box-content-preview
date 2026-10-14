import React from 'react';
import { Breadcrumb, Text } from '@box/blueprint-web';
import { ROOT_FOLDER, VIEWS } from './constants';
import './BreadcrumbsV2.scss';

export type Props = {
    filename: string;
    fullPath: string;
    onClick: (fullPath: string) => void;
    view: string;
};

// Blueprint crumbs accept no per-item attributes, so the click is logged programmatically
// (precedent: SettingsRadioItem.tsx)
const recordBreadcrumbClick = (): void => {
    const recordAction = window.Box?.Preview?.resin?.recordAction;

    recordAction?.({
        action: 'programmatic',
        component: 'archive',
        target: 'breadcrumb',
    });
};

export default function BreadcrumbsV2({ filename, fullPath, onClick, view }: Props): JSX.Element {
    const pathNames = fullPath === ROOT_FOLDER ? [] : fullPath.split('/').slice(0, -1);
    const crumbs = [
        { id: ROOT_FOLDER, name: filename },
        ...pathNames.map((name, index) => ({ id: `${pathNames.slice(0, index + 1).join('/')}/`, name })),
    ];

    const handlePageLinkClick = (path: string): void => {
        recordBreadcrumbClick();
        onClick(path);
    };

    return (
        <div className="bp-BreadcrumbsV2">
            {view === VIEWS.VIEW_SEARCH ? (
                <Text as="span" variant="bodyDefaultBold">
                    {__('search_results')}
                </Text>
            ) : (
                <Breadcrumb
                    breadcrumbAriaLabel={__('breadcrumb')}
                    crumbs={crumbs}
                    isResponsiveEnabled={false}
                    onPageLinkClick={handlePageLinkClick}
                    truncatedLinksIconAriaLabel={__('breadcrumb_truncated')}
                />
            )}
        </div>
    );
}
