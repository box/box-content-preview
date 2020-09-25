import AnnotationControlsFSM, { AnnotationInput, AnnotationState } from '../AnnotationControlsFSM';
import { AnnotationMode } from '../AnnotationControls';

describe('lib/AnnotationControlsFSM', () => {
    describe('AnnotationState.NONE', () => {
        // Go to different states
        [
            {
                input: AnnotationInput.CLICK,
                mode: AnnotationMode.HIGHLIGHT,
                nextState: AnnotationState.HIGHLIGHT,
                output: AnnotationMode.HIGHLIGHT,
            },
            {
                input: AnnotationInput.CLICK,
                mode: AnnotationMode.REGION,
                nextState: AnnotationState.REGION,
                output: AnnotationMode.REGION,
            },
            {
                input: AnnotationInput.CREATE,
                mode: AnnotationMode.HIGHLIGHT,
                nextState: AnnotationState.HIGHLIGHT_TEMP,
                output: AnnotationMode.HIGHLIGHT,
            },
            {
                input: AnnotationInput.CREATE,
                mode: AnnotationMode.REGION,
                nextState: AnnotationState.REGION_TEMP,
                output: AnnotationMode.REGION,
            },
            {
                input: AnnotationInput.STARTED,
                mode: AnnotationMode.HIGHLIGHT,
                nextState: AnnotationState.HIGHLIGHT_TEMP,
                output: AnnotationMode.HIGHLIGHT,
            },
            {
                input: AnnotationInput.STARTED,
                mode: AnnotationMode.REGION,
                nextState: AnnotationState.REGION_TEMP,
                output: AnnotationMode.REGION,
            },
        ].forEach(({ input, mode, nextState, output }) => {
            it(`should go to state ${nextState} and output ${output} if input is ${input} and mode is ${mode}`, () => {
                const annotationControlsFSM = new AnnotationControlsFSM();

                expect(annotationControlsFSM.transition(input, mode)).toBe(output);
                expect(annotationControlsFSM.getState()).toBe(nextState);
            });
        });

        // Stay in the same state
        [AnnotationInput.CANCEL, AnnotationInput.SUCCESS, AnnotationInput.UPDATE].forEach(input => {
            it(`should stay in state none if input is ${input}`, () => {
                const annotationControlsFSM = new AnnotationControlsFSM();

                expect(annotationControlsFSM.transition(input)).toBe(AnnotationMode.NONE);
                expect(annotationControlsFSM.getState()).toBe(AnnotationState.NONE);
            });
        });

        // Should reset state
        it('should reset state if input is AnnotationInput.RESET', () => {
            const annotationControlsFSM = new AnnotationControlsFSM();

            expect(annotationControlsFSM.transition(AnnotationInput.RESET)).toEqual(AnnotationMode.NONE);
            expect(annotationControlsFSM.getState()).toEqual(AnnotationState.NONE);
        });

        it('should reset state if input is AnnotationInput.INIT', () => {
            const annotationControlsFSM = new AnnotationControlsFSM();

            expect(annotationControlsFSM.transition(AnnotationInput.INIT)).toEqual(AnnotationMode.NONE);
            expect(annotationControlsFSM.getState()).toEqual(AnnotationState.NONE);
        });
    });

    describe('AnnotationState.HIGHLIGHT/REGION', () => {
        // Stay in the same state
        [AnnotationState.HIGHLIGHT, AnnotationState.REGION].forEach(state => {
            Object.values(AnnotationInput)
                .filter(
                    input =>
                        input !== AnnotationInput.CLICK &&
                        input !== AnnotationInput.RESET &&
                        input !== AnnotationInput.INIT,
                )
                .forEach(input => {
                    it(`should stay in state ${state} if input is ${input}`, () => {
                        const annotationControlsFSM = new AnnotationControlsFSM(state);

                        expect(annotationControlsFSM.transition(input)).toBe(state);
                        expect(annotationControlsFSM.getState()).toBe(state);
                    });
                });
        });

        // Go to different states
        describe('AnnotationState.HIGHLIGHT', () => {
            [
                {
                    input: AnnotationInput.CLICK,
                    mode: AnnotationMode.HIGHLIGHT,
                    output: AnnotationMode.NONE,
                },
                {
                    input: AnnotationInput.CLICK,
                    mode: AnnotationMode.REGION,
                    output: AnnotationMode.REGION,
                },
                {
                    input: AnnotationInput.RESET,
                    mode: AnnotationMode.HIGHLIGHT,
                    output: AnnotationMode.NONE,
                },
                {
                    input: AnnotationInput.RESET,
                    mode: AnnotationMode.REGION,
                    output: AnnotationMode.NONE,
                },
                {
                    input: AnnotationInput.INIT,
                    mode: AnnotationMode.HIGHLIGHT,
                    output: AnnotationMode.HIGHLIGHT,
                },
                {
                    input: AnnotationInput.INIT,
                    mode: AnnotationMode.REGION,
                    output: AnnotationMode.HIGHLIGHT,
                },
            ].forEach(({ input, mode, output }) => {
                test(`should output ${output} if input is ${input} and mode is ${mode}`, () => {
                    const annotationControlsFSM = new AnnotationControlsFSM(AnnotationState.HIGHLIGHT);

                    expect(annotationControlsFSM.transition(input, mode)).toEqual(output);
                    expect(annotationControlsFSM.getState()).toEqual(output);
                });
            });
        });

        // Go to different states
        describe('AnnotationState.REGION', () => {
            [
                {
                    input: AnnotationInput.CLICK,
                    mode: AnnotationMode.REGION,
                    output: AnnotationMode.NONE,
                },
                {
                    input: AnnotationInput.CLICK,
                    mode: AnnotationMode.HIGHLIGHT,
                    output: AnnotationMode.HIGHLIGHT,
                },
                {
                    input: AnnotationInput.RESET,
                    mode: AnnotationMode.REGION,
                    output: AnnotationMode.NONE,
                },
                {
                    input: AnnotationInput.RESET,
                    mode: AnnotationMode.HIGHLIGHT,
                    output: AnnotationMode.NONE,
                },
                {
                    input: AnnotationInput.INIT,
                    mode: AnnotationMode.REGION,
                    output: AnnotationMode.REGION,
                },
                {
                    input: AnnotationInput.INIT,
                    mode: AnnotationMode.HIGHLIGHT,
                    output: AnnotationMode.REGION,
                },
            ].forEach(({ input, mode, output }) => {
                test(`should output ${output} if input is ${input} and mode is ${mode}`, () => {
                    const annotationControlsFSM = new AnnotationControlsFSM(AnnotationState.REGION);

                    expect(annotationControlsFSM.transition(input, mode)).toEqual(output);
                    expect(annotationControlsFSM.getState()).toEqual(output);
                });
            });
        });
    });

    describe('AnnotationState.HIGHLIGHT_TEMP/REGION_TEMP', () => {
        [
            {
                state: AnnotationState.HIGHLIGHT_TEMP,
                stateMode: AnnotationMode.HIGHLIGHT,
            },
            {
                state: AnnotationState.REGION_TEMP,
                stateMode: AnnotationMode.REGION,
            },
        ].forEach(({ state, stateMode }) => {
            // Go to none state
            [
                {
                    input: AnnotationInput.CANCEL,
                    nextState: AnnotationState.NONE,
                    output: AnnotationMode.NONE,
                },
                {
                    input: AnnotationInput.SUCCESS,
                    nextState: AnnotationState.NONE,
                    output: AnnotationMode.NONE,
                },
                {
                    input: AnnotationInput.RESET,
                    nextState: AnnotationState.NONE,
                    output: AnnotationMode.NONE,
                },
                {
                    input: AnnotationInput.INIT,
                    nextState: AnnotationState.NONE,
                    output: AnnotationMode.NONE,
                },
            ].forEach(({ input, nextState, output }) => {
                test(`should go to state ${nextState} and output ${output} if input is ${input}`, () => {
                    const annotationControlsFSM = new AnnotationControlsFSM(state);

                    expect(annotationControlsFSM.transition(input)).toBe(output);
                    expect(annotationControlsFSM.getState()).toBe(nextState);
                });
            });

            // Stay in the same state
            [AnnotationInput.CREATE, AnnotationInput.STARTED, AnnotationInput.UPDATE].forEach(input => {
                test(`should stay in state ${state} if input is ${input}`, () => {
                    const annotationControlsFSM = new AnnotationControlsFSM(state);

                    expect(annotationControlsFSM.transition(input)).toEqual(stateMode);
                    expect(annotationControlsFSM.getState()).toEqual(state);
                });
            });
        });

        // Go to different states
        describe('AnnotationState.HIGHLIGHT_TEMP', () => {
            [
                {
                    input: AnnotationInput.CLICK,
                    mode: AnnotationMode.HIGHLIGHT,
                    output: AnnotationMode.NONE,
                },
                {
                    input: AnnotationInput.CLICK,
                    mode: AnnotationMode.REGION,
                    output: AnnotationMode.REGION,
                },
                {
                    input: AnnotationInput.RESET,
                    mode: AnnotationMode.HIGHLIGHT,
                    output: AnnotationMode.NONE,
                },
                {
                    input: AnnotationInput.RESET,
                    mode: AnnotationMode.REGION,
                    output: AnnotationMode.NONE,
                },
                {
                    input: AnnotationInput.INIT,
                    mode: AnnotationMode.HIGHLIGHT,
                    output: AnnotationMode.NONE,
                },
                {
                    input: AnnotationInput.INIT,
                    mode: AnnotationMode.REGION,
                    output: AnnotationMode.NONE,
                },
            ].forEach(({ input, mode, output }) => {
                test(`should output ${output} if input is ${input} and mode is ${mode}`, () => {
                    const annotationControlsFSM = new AnnotationControlsFSM(AnnotationState.HIGHLIGHT_TEMP);

                    expect(annotationControlsFSM.transition(input, mode)).toEqual(output);
                    expect(annotationControlsFSM.getState()).toEqual(output);
                });
            });
        });

        // Go to different states
        describe('AnnotationState.REGION_TEMP', () => {
            [
                {
                    input: AnnotationInput.CLICK,
                    mode: AnnotationMode.REGION,
                    output: AnnotationMode.NONE,
                },
                {
                    input: AnnotationInput.CLICK,
                    mode: AnnotationMode.HIGHLIGHT,
                    output: AnnotationMode.HIGHLIGHT,
                },
                {
                    input: AnnotationInput.RESET,
                    mode: AnnotationMode.REGION,
                    output: AnnotationMode.NONE,
                },
                {
                    input: AnnotationInput.RESET,
                    mode: AnnotationMode.HIGHLIGHT,
                    output: AnnotationMode.NONE,
                },
                {
                    input: AnnotationInput.INIT,
                    mode: AnnotationMode.REGION,
                    output: AnnotationMode.NONE,
                },
                {
                    input: AnnotationInput.INIT,
                    mode: AnnotationMode.HIGHLIGHT,
                    output: AnnotationMode.NONE,
                },
            ].forEach(({ input, mode, output }) => {
                test(`should output ${output} if input is ${input} and mode is ${mode}`, () => {
                    const annotationControlsFSM = new AnnotationControlsFSM(AnnotationState.REGION_TEMP);

                    expect(annotationControlsFSM.transition(input, mode)).toEqual(output);
                    expect(annotationControlsFSM.getState()).toEqual(output);
                });
            });
        });
    });
});
