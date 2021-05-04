import React from 'react';
import noop from 'lodash/noop';

export type Context = {
    setIsForced: (isForced: boolean) => void;
};

export default React.createContext<Context>({
    setIsForced: noop,
});
