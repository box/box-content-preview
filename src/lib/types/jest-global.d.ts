declare global {
    // eslint-disable-next-line vars-on-top, no-var
    var MouseEventExtended: {
        new (
            type: string,
            eventInitDict?: MouseEventInit & {
                pageX?: number;
                pageY?: number;
            },
        ): MouseEvent;
        prototype: MouseEvent;
    };
}

export {};
