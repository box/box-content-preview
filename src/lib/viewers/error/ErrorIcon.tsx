import React from 'react';
import { getFileCategoryByExtension, ItemIcon } from '@box/item-icon';
import { getIcon } from 'box-ui-elements/es/components/preview';

export type Props = {
    extension?: string;
    isBlueprintEnabled?: boolean;
};

export default function ErrorIcon({ extension, isBlueprintEnabled = false }: Props): JSX.Element {
    if (isBlueprintEnabled) {
        return <ItemIcon ariaHidden iconType={getFileCategoryByExtension(extension?.toLowerCase())} />;
    }

    const Icon = getIcon(extension);

    return <Icon extension={extension} />;
}
