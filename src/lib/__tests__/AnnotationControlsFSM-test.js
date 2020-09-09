import AnnotationControlsFSM, { AnnotationInput, AnnotationState } from '../AnnotationControlsFSM';
import { AnnotationMode } from '../AnnotationControls';

let annotationControlsFSM;

describe('lib/AnnotationControlsFSM', () => {
    beforeEach(() => {
        annotationControlsFSM = new AnnotationControlsFSM();
    });

    [
        {
            state: AnnotationState.NONE,
            input: AnnotationInput.CLICK,
            mode: AnnotationMode.HIGHLIGHT,
            nextState: AnnotationState.HIGHLIGHT,
            output: AnnotationMode.HIGHLIGHT,
        },
        {
            state: AnnotationState.NONE,
            input: AnnotationInput.CLICK,
            mode: AnnotationMode.REGION,
            nextState: AnnotationState.REGION,
            output: AnnotationMode.REGION,
        },
        {
            state: AnnotationState.NONE,
            input: AnnotationInput.CREATE,
            mode: AnnotationMode.HIGHLIGHT,
            nextState: AnnotationState.HIGHLIGHT_TEMP,
            output: AnnotationMode.HIGHLIGHT,
        },
        {
            state: AnnotationState.NONE,
            input: AnnotationInput.CREATE,
            mode: AnnotationMode.REGION,
            nextState: AnnotationState.REGION_TEMP,
            output: AnnotationMode.REGION,
        },
        {
            state: AnnotationState.HIGHLIGHT,
            input: AnnotationInput.CANCEL,
            mode: AnnotationMode.HIGHLIGHT,
            nextState: AnnotationState.HIGHLIGHT,
            output: AnnotationMode.HIGHLIGHT,
        },
        {
            state: AnnotationState.HIGHLIGHT,
            input: AnnotationInput.SUCCESS,
            mode: undefined,
            nextState: AnnotationState.HIGHLIGHT,
            output: AnnotationMode.HIGHLIGHT,
        },
        {
            state: AnnotationState.HIGHLIGHT_TEMP,
            input: AnnotationInput.CLICK,
            mode: AnnotationMode.HIGHLIGHT,
            nextState: AnnotationState.NONE,
            output: AnnotationMode.NONE,
        },
        {
            state: AnnotationState.HIGHLIGHT_TEMP,
            input: AnnotationInput.CLICK,
            mode: AnnotationMode.REGION,
            nextState: AnnotationState.REGION,
            output: AnnotationMode.REGION,
        },
        {
            state: AnnotationState.HIGHLIGHT_TEMP,
            input: AnnotationInput.CANCEL,
            mode: AnnotationMode.HIGHLIGHT,
            nextState: AnnotationState.NONE,
            output: AnnotationMode.NONE,
        },
        {
            state: AnnotationState.HIGHLIGHT_TEMP,
            input: AnnotationInput.SUCCESS,
            mode: undefined,
            nextState: AnnotationState.NONE,
            output: AnnotationMode.NONE,
        },
    ].forEach(({ state, input, mode, nextState, output }) => {
        it(`should go to state ${nextState} and output ${output}`, () => {
            annotationControlsFSM.setState(state);

            expect(annotationControlsFSM.transition(input, mode)).to.equal(output);
            expect(annotationControlsFSM.getState()).to.equal(nextState);
        });
    });
});
