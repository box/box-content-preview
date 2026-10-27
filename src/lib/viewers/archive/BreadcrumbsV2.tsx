import React from 'react';
import { Breadcrumb, Text } from '@box/blueprint-web';
import { ROOT_FOLDER, VIEWS } from './constants';
import './BreadcrumbsV2.scss';

export type Props = {
    filename: string;
    fullPath: string;
    onClick: (fullPath: string) => void;
    resin?: {
        recordAction: (payload: { action: string; component: string; feature: string; target: string }) => void;
    };
    view: string;
};

export default function BreadcrumbsV2({ filename, fullPath, onClick, resin, view }: Props): JSX.Element {
    const pathNames = fullPath === ROOT_FOLDER ? [] : fullPath.split('/').slice(0, -1);
    const crumbs = [
        { id: ROOT_FOLDER, name: filename },
        ...pathNames.map((name, index) => ({ id: `${pathNames.slice(0, index + 1).join('/')}/`, name })),
    ];

    const handlePageLinkClick = (path: string): void => {
        // Blueprint crumbs accept no per-item attributes, so the click is logged programmatically
        // (precedent: MP3Viewer.js recordToolbarAction)
        resin?.recordAction({
            action: 'programmatic',
            component: 'archive',
            feature: 'archive',
            target: 'breadcrumb',
        });
        onClick(path);
    };

    return (
        <div className="bp-BreadcrumbsV2" data-testid="bp-archive-breadcrumbs">
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
