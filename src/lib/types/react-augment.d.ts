import React from 'react';

declare global {
    interface Window {
        Box?: {
            Preview?: {
                resin?: {
                    recordAction: (payload: { action: string; component: string; target: string }) => void;
                };
            };
        };
    }
}

declare module 'react' {
    function forwardRef<T, P = Record<string, never>>(
        render: (props: P, ref: React.ForwardedRef<T>) => React.ReactElement | null,
    ): (props: P & RefAttributes<T>) => React.ReactElement | null;
}
