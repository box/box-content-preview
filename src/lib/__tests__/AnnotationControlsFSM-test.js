import AnnotationControlsFSM, { AnnotationInput, AnnotationState } from '../AnnotationControlsFSM';
import { AnnotationMode } from '../AnnotationControls';

describe('lib/AnnotationControlsFSM', () => {
    describe('AnnotationState.NONE', () => {
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
        ].forEach(({ input, mode, nextState, output }) => {
            it(`should go to state ${nextState} and output ${output}`, () => {
                const annotationControlsFSM = new AnnotationControlsFSM();

                expect(annotationControlsFSM.transition(input, mode)).to.equal(output);
                expect(annotationControlsFSM.getState()).to.equal(nextState);
            });
        });

        [AnnotationInput.CANCEL, AnnotationInput.SUCCESS, AnnotationInput.UPDATE].forEach(input => {
            it(`should stay in state none if input is ${input}`, () => {
                const annotationControlsFSM = new AnnotationControlsFSM();

                expect(annotationControlsFSM.transition(input)).to.equal(AnnotationMode.NONE);
                expect(annotationControlsFSM.getState()).to.equal(AnnotationState.NONE);
            });
        });
    });

    describe('AnnotationState.HIGHLIGHT/REGION', () => {
        [AnnotationState.HIGHLIGHT, AnnotationState.REGION].forEach(state => {
            // non-Click input
            [AnnotationInput.CANCEL, AnnotationInput.CREATE, AnnotationInput.SUCCESS, AnnotationInput.SUCCESS].forEach(
                input => {
                    it(`should stay in state ${state}`, () => {
                        const annotationControlsFSM = new AnnotationControlsFSM(state);

                        expect(annotationControlsFSM.transition(input)).to.equal(state);
                        expect(annotationControlsFSM.getState()).to.equal(state);
                    });
                },
            );

            // Click input
            [AnnotationMode.HIGHLIGHT, AnnotationMode.REGION].forEach(mode => {
                it(`should go to state none/${mode} if input is click and mode is ${mode}`, () => {
                    const annotationControlsFSM = new AnnotationControlsFSM(state);

                    const output = state === mode ? AnnotationMode.NONE : mode;

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
            [
                {
                    input: AnnotationInput.CLICK,
                    mode: AnnotationMode.HIGHLIGHT,
                    nextState:
                        stateMode === AnnotationMode.HIGHLIGHT ? AnnotationState.NONE : AnnotationState.HIGHLIGHT,
                    output: stateMode === AnnotationMode.HIGHLIGHT ? AnnotationMode.NONE : AnnotationMode.HIGHLIGHT,
                },
                {
                    input: AnnotationInput.CLICK,
                    mode: AnnotationMode.REGION,
                    nextState: stateMode === AnnotationMode.REGION ? AnnotationState.NONE : AnnotationState.REGION,
                    output: stateMode === AnnotationMode.REGION ? AnnotationMode.NONE : AnnotationMode.REGION,
                },
                {
                    input: AnnotationInput.CANCEL,
                    mode: AnnotationMode.HIGHLIGHT,
                    nextState: AnnotationState.NONE,
                    output: AnnotationMode.NONE,
                },
                {
                    input: AnnotationInput.SUCCESS,
                    mode: undefined,
                    nextState: AnnotationState.NONE,
                    output: AnnotationMode.NONE,
                },
            ].forEach(({ input, mode, nextState, output }) => {
                it(`should go to state ${nextState} and output ${output}`, () => {
                    const annotationControlsFSM = new AnnotationControlsFSM(state);

                    expect(annotationControlsFSM.transition(input, mode)).to.equal(output);
                    expect(annotationControlsFSM.getState()).to.equal(nextState);
                });
            });

            [AnnotationInput.CREATE, AnnotationInput.UPDATE].forEach(input => {
                it(`should stay in state ${state} if input is ${input}`, () => {
                    const annotationControlsFSM = new AnnotationControlsFSM(state);

                    expect(annotationControlsFSM.transition(input)).to.equal(stateMode);
                    expect(annotationControlsFSM.getState()).to.equal(state);
                });
            });
        });
    });
});
