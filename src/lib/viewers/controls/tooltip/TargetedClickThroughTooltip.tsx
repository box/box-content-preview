import React from 'react';
import Tooltip from 'box-ui-elements/es/components/tooltip/Tooltip';
import { withTargetedClickThrough } from 'box-ui-elements/es/features/targeting/hocs';

const TargetedClickThroughTooltip = withTargetedClickThrough(
    ({ children, ...props }: { children: React.ReactNode }): JSX.Element => {
        return <Tooltip {...props}>{children}</Tooltip>;
    },
);

export default TargetedClickThroughTooltip;
