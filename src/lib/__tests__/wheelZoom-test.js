import { getWheelZoomScaleDelta } from '../wheelZoom';

describe('lib/wheelZoom', () => {
    describe('getWheelZoomScaleDelta()', () => {
        test.each`
            deltaY   | deltaMode    | expected
            ${0}     | ${0}         | ${0}
            ${-4}    | ${0}         | ${0.04}
            ${10}    | ${0}         | ${-0.1}
            ${-49}   | ${0}         | ${0.49}
            ${-50}   | ${0}         | ${0.1}
            ${-100}  | ${0}         | ${0.1}
            ${100}   | ${0}         | ${-0.1}
            ${120}   | ${0}         | ${-0.1}
            ${-200}  | ${0}         | ${0.1}
            ${3}     | ${1}         | ${-0.1}
            ${-1}    | ${1}         | ${0.1}
            ${1}     | ${2}         | ${-0.1}
            ${-8}    | ${undefined} | ${0.08}
        `('deltaY $deltaY mode $deltaMode changes scale by $expected', ({ deltaY, deltaMode, expected }) => {
            expect(getWheelZoomScaleDelta({ deltaY, deltaMode })).toBeCloseTo(expected);
        });
    });
});
