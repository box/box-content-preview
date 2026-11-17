import React from 'react';
import noop from 'lodash/noop';

export type Context = {
    // While editing, the cursor leaving the layer keeps focus in the field, so the layer stays shown
    setIsEditing: (isEditing: boolean) => void;
    setIsForced: (isForced: boolean) => void;
};

export default React.createContext<Context>({
    setIsEditing: noop,
    setIsForced: noop,
});
