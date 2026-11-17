import React from 'react';
import { DropdownMenu, EllipsizableText, Focusable, IconButton, Text, TextButton, Tooltip } from '@box/blueprint-web';
import { Ellipsis } from '@box/blueprint-web-assets/icons/Medium';
import { PointerRight } from '@box/blueprint-web-assets/icons/Fill';
import { bpSize030, BreakpointMedium } from '@box/blueprint-web-assets/tokens/tokens';
import { PortalContainerContext } from '../../BlueprintProviders';
import { stopEscapePropagation, stopKeyPropagation } from '../controls/settings/stopMenuKeyPropagation';
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
    const container = React.useContext(PortalContainerContext);
    const breadcrumbRef = React.useRef<HTMLDivElement>(null);
    const [isCompact, setIsCompact] = React.useState(false);
    const pathNames = fullPath === ROOT_FOLDER ? [] : fullPath.split('/').slice(0, -1);
    const crumbs = [
        { id: ROOT_FOLDER, name: filename },
        ...pathNames.map((name, index) => ({ id: `${pathNames.slice(0, index + 1).join('/')}/`, name })),
    ];
    let hiddenCrumbs: typeof crumbs = [];
    let visibleCrumbs = crumbs;

    if (isCompact) {
        hiddenCrumbs = crumbs.slice(0, -1);
        visibleCrumbs = crumbs.slice(-1);
    } else if (crumbs.length > 4) {
        hiddenCrumbs = crumbs.slice(1, -2);
        visibleCrumbs = [crumbs[0], ...crumbs.slice(-2)];
    }

    React.useLayoutEffect(() => {
        const breadcrumb = breadcrumbRef.current;

        if (!breadcrumb) {
            return undefined;
        }

        const updateCompactLayout = (): void => {
            const { clientWidth } = breadcrumb;
            setIsCompact(clientWidth > 0 && clientWidth <= parseInt(BreakpointMedium, 10));
        };

        updateCompactLayout();

        if (typeof ResizeObserver === 'undefined') {
            return undefined;
        }

        const observer = new ResizeObserver(updateCompactLayout);
        observer.observe(breadcrumb);

        return (): void => observer.disconnect();
    }, []);

    const handlePageLinkClick = (path: string): void => {
        resin?.recordAction({
            action: 'programmatic',
            component: 'archive',
            feature: 'archive',
            target: 'breadcrumb',
        });
        onClick(path);
    };

    const collapsedCrumbs = hiddenCrumbs.length > 0 && (
        <li className="bp-BreadcrumbsV2-overflow">
            <DropdownMenu.Root modal={false}>
                <DropdownMenu.Trigger asChild>
                    <IconButton aria-label={__('breadcrumb_truncated')} icon={Ellipsis} size="x-small" />
                </DropdownMenu.Trigger>
                <DropdownMenu.Content
                    align="start"
                    className="bp-BreadcrumbsV2-menu"
                    container={container ?? undefined}
                    onEscapeKeyDown={stopEscapePropagation}
                    onKeyDown={stopKeyPropagation}
                >
                    {hiddenCrumbs.map(crumb => (
                        <Tooltip key={crumb.id} content={crumb.name}>
                            <DropdownMenu.Item onSelect={() => handlePageLinkClick(crumb.id)}>
                                <Text as="span" className="bp-BreadcrumbsV2-menuLabel">
                                    {crumb.name}
                                </Text>
                            </DropdownMenu.Item>
                        </Tooltip>
                    ))}
                </DropdownMenu.Content>
            </DropdownMenu.Root>
            <PointerRight aria-hidden="true" height={bpSize030} width={bpSize030} />
        </li>
    );

    return (
        <div ref={breadcrumbRef} className="bp-BreadcrumbsV2" data-testid="bp-archive-breadcrumbs">
            {view === VIEWS.VIEW_SEARCH ? (
                <Text as="span" variant="bodyDefaultBold">
                    {__('search_results')}
                </Text>
            ) : (
                <nav aria-label={__('breadcrumb')} className="bp-BreadcrumbsV2-nav">
                    <ol className="bp-BreadcrumbsV2-list">
                        {isCompact && collapsedCrumbs}
                        {visibleCrumbs.map((crumb, index) => (
                            <React.Fragment key={crumb.id}>
                                <li
                                    className={
                                        crumb.id === fullPath ? 'bp-BreadcrumbsV2-current' : 'bp-BreadcrumbsV2-ancestor'
                                    }
                                >
                                    {crumb.id === fullPath ? (
                                        <Focusable>
                                            <EllipsizableText
                                                aria-current="page"
                                                as="span"
                                                lineClamp={1}
                                                variant="bodyLargeBold"
                                            >
                                                {crumb.name}
                                            </EllipsizableText>
                                        </Focusable>
                                    ) : (
                                        <>
                                            <TextButton
                                                color="textOnLightSecondary"
                                                ellipsizable
                                                onClick={() => handlePageLinkClick(crumb.id)}
                                                variant="bodyLarge"
                                            >
                                                {crumb.name}
                                            </TextButton>
                                            <PointerRight aria-hidden="true" height={bpSize030} width={bpSize030} />
                                        </>
                                    )}
                                </li>
                                {!isCompact && index === 0 && collapsedCrumbs}
                            </React.Fragment>
                        ))}
                    </ol>
                </nav>
            )}
        </div>
    );
}
