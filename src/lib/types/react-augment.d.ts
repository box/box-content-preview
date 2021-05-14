import React from 'react';

declare module 'react' {
    function forwardRef<T, P = {}>(
        render: (props: P, ref: React.ForwardedRef<T>) => React.ReactElement | null,
    ): (props: P & RefAttributes<T>) => React.ReactElement | null;
}
