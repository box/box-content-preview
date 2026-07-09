export const round = (value: number): number => {
    return +value.toFixed(4);
};

export const percent = (value1: number, value2: number): number => {
    return round((value1 / value2) * 100);
};
