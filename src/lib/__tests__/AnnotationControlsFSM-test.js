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

                expect(annotationControlsFSM.transition(input, mode)).to.equal(output);
                expect(annotationControlsFSM.getState()).to.equal(nextState);
            });
        });

        // Stay in the same state
        [AnnotationInput.CANCEL, AnnotationInput.SUCCESS, AnnotationInput.UPDATE].forEach(input => {
            it(`should stay in state none if input is ${input}`, () => {
                const annotationControlsFSM = new AnnotationControlsFSM();

                expect(annotationControlsFSM.transition(input)).to.equal(AnnotationMode.NONE);
                expect(annotationControlsFSM.getState()).to.equal(AnnotationState.NONE);
            });
        });

        // Should reset state
        it('should reset state if input is AnnotationInput.RESET', () => {
            const annotationControlsFSM = new AnnotationControlsFSM(AnnotationMode.REGION);

            expect(annotationControlsFSM.transition(AnnotationInput.RESET)).to.equal(AnnotationMode.NONE);
            expect(annotationControlsFSM.getState()).to.equal(AnnotationState.NONE);
        });
    });

    describe('AnnotationState.HIGHLIGHT/REGION', () => {
        // Stay in the same state
        [AnnotationState.HIGHLIGHT, AnnotationState.REGION].forEach(state => {
            Object.values(AnnotationInput)
                .filter(input => input !== AnnotationInput.CLICK && input !== AnnotationInput.RESET)
                .forEach(input => {
                    it(`should stay in state ${state} if input is ${input}`, () => {
                        const annotationControlsFSM = new AnnotationControlsFSM(state);

                        expect(annotationControlsFSM.transition(input)).to.equal(state);
                        expect(annotationControlsFSM.getState()).to.equal(state);
                    });
                });
        });

        // Go to different states
        describe('AnnotationState.HIGHLIGHT', () => {
            [
                {
                    mode: AnnotationMode.HIGHLIGHT,
                    output: AnnotationMode.NONE,
                },
                {
                    mode: AnnotationMode.REGION,
                    output: AnnotationMode.REGION,
                },
            ].forEach(({ mode, output }) => {
                it(`should output ${output} if input is click and mode is ${mode}`, () => {
                    const annotationControlsFSM = new AnnotationControlsFSM(AnnotationState.HIGHLIGHT);

                    expect(annotationControlsFSM.transition(AnnotationInput.CLICK, mode)).to.equal(output);
                    expect(annotationControlsFSM.getState()).to.equal(output);
                });
            });
        });

        // Go to different states
        describe('AnnotationState.REGION', () => {
            [
                {
                    mode: AnnotationMode.REGION,
                    output: AnnotationMode.NONE,
                },
                {
                    mode: AnnotationMode.HIGHLIGHT,
                    output: AnnotationMode.HIGHLIGHT,
                },
            ].forEach(({ mode, output }) => {
                it(`should output ${output} if input is click and mode is ${mode}`, () => {
                    const annotationControlsFSM = new AnnotationControlsFSM(AnnotationState.REGION);

                    expect(annotationControlsFSM.transition(AnnotationInput.CLICK, mode)).to.equal(output);
                    expect(annotationControlsFSM.getState()).to.equal(output);
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
            ].forEach(({ input, nextState, output }) => {
                it(`should go to state ${nextState} and output ${output} if input is ${input}`, () => {
                    const annotationControlsFSM = new AnnotationControlsFSM(state);

                    expect(annotationControlsFSM.transition(input)).to.equal(output);
                    expect(annotationControlsFSM.getState()).to.equal(nextState);
                });
            });

            // Stay in the same state
            [AnnotationInput.CREATE, AnnotationInput.STARTED, AnnotationInput.UPDATE].forEach(input => {
                it(`should stay in state ${state} if input is ${input}`, () => {
                    const annotationControlsFSM = new AnnotationControlsFSM(state);

                    expect(annotationControlsFSM.transition(input)).to.equal(stateMode);
                    expect(annotationControlsFSM.getState()).to.equal(state);
                });
            });
        });

        // Go to different states
        describe('AnnotationState.HIGHLIGHT_TEMP', () => {
            [
                {
                    mode: AnnotationMode.HIGHLIGHT,
                    output: AnnotationMode.NONE,
                },
                {
                    mode: AnnotationMode.REGION,
                    output: AnnotationMode.REGION,
                },
            ].forEach(({ mode, output }) => {
                it(`should output ${output} if input is click and mode is ${mode}`, () => {
                    const annotationControlsFSM = new AnnotationControlsFSM(AnnotationState.HIGHLIGHT_TEMP);

                    expect(annotationControlsFSM.transition(AnnotationInput.CLICK, mode)).to.equal(output);
                    expect(annotationControlsFSM.getState()).to.equal(output);
                });
            });
        });

        // Go to different states
        describe('AnnotationState.REGION_TEMP', () => {
            [
                {
                    mode: AnnotationMode.REGION,
                    output: AnnotationMode.NONE,
                },
                {
                    mode: AnnotationMode.HIGHLIGHT,
                    output: AnnotationMode.HIGHLIGHT,
                },
            ].forEach(({ mode, output }) => {
                it(`should output ${output} if input is click and mode is ${mode}`, () => {
                    const annotationControlsFSM = new AnnotationControlsFSM(AnnotationState.REGION_TEMP);

                    expect(annotationControlsFSM.transition(AnnotationInput.CLICK, mode)).to.equal(output);
                    expect(annotationControlsFSM.getState()).to.equal(output);
                });
            });
        });
    });
});
