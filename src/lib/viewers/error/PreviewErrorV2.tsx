import React from 'react';
import { EmptyState, Link, Text } from '@box/blueprint-web';
import { getFileCategoryByExtension, itemIconTable } from '@box/item-icon';

export type Props = {
    extension?: string;
    linkText?: string;
    linkUrl?: string;
    message: string;
    onDownload?: () => void;
};

export default function PreviewErrorV2({ extension, linkText, linkUrl, message, onDownload }: Props): JSX.Element {
    const fileCategory = getFileCategoryByExtension(extension?.toLowerCase()) as keyof typeof itemIconTable;
    const illustration = itemIconTable[fileCategory] || itemIconTable.default;
    const hasLink = !!linkText && !!linkUrl;

    return (
        <EmptyState
            body={<Text as="p">{message}</Text>}
            className="bp-PreviewErrorV2-emptyState"
            illustration={illustration}
        >
            {hasLink && (
                <EmptyState.PrimaryAction
                    clickOnSpace={false}
                    data-resin-target="errorLink"
                    render={<Link href={linkUrl} rel="noopener noreferrer" target="_blank" unstyled />}
                >
                    {linkText}
                </EmptyState.PrimaryAction>
            )}
            {!hasLink && onDownload && (
                <EmptyState.PrimaryAction
                    data-resin-target="download"
                    data-testid="preview-error-download-btn"
                    onClick={onDownload}
                >
                    {__('download')}
                </EmptyState.PrimaryAction>
            )}
        </EmptyState>
    );
}
