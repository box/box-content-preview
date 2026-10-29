import React from 'react';
import { Button, EmptyState, Link, Text } from '@box/blueprint-web';
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

    // EmptyState.PrimaryAction forces the secondary variant, so the actions use Button directly
    return (
        <EmptyState
            body={<Text as="p">{message}</Text>}
            className="bp-PreviewErrorV2-emptyState"
            illustration={illustration}
        >
            {hasLink && (
                <Button
                    clickOnSpace={false}
                    render={<Link href={linkUrl} rel="noopener noreferrer" target="_blank" unstyled />}
                    variant="primary"
                >
                    {linkText}
                </Button>
            )}
            {!hasLink && onDownload && (
                <Button data-testid="preview-error-download-btn" onClick={onDownload} variant="primary">
                    {__('download')}
                </Button>
            )}
        </EmptyState>
    );
}
