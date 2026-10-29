import React from 'react';
import { getIcon } from 'box-ui-elements/es/components/preview';

export type Props = {
    extension?: string;
};

export default function ErrorIcon({ extension }: Props): JSX.Element {
    const Icon = getIcon(extension);

    return <Icon extension={extension} />;
}
