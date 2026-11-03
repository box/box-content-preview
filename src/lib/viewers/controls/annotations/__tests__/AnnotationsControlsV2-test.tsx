import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnnotationsControlsV2, { Props } from '../AnnotationsControlsV2';
import BlueprintProviders from '../../../../BlueprintProviders';
import { AnnotationMode } from '../../../../types';

describe('AnnotationsControlsV2', () => {
    const getWrapper = (props: Partial<Props> = {}) =>
        render(
            <Toolbar.Root aria-label="Controls">
                <AnnotationsControlsV2 modes={[AnnotationMode.REGION, AnnotationMode.DRAWING]} {...props} />
            </Toolbar.Root>,
            { wrapper: BlueprintProviders },
        );

    test('should render a separator, the exit button and the markup toggle', () => {
        getWrapper();

        const toolbar = screen.getByRole('toolbar');

        expect(toolbar.firstElementChild).toBe(screen.getByRole('separator'));
        expect(toolbar).toContainElement(screen.getByRole('button', { name: __('exit_annotations') }));
        expect(toolbar).toContainElement(screen.getByRole('button', { name: __('annotation_tools') }));
    });

    test('should start the first mode from the markup toggle', async () => {
        const onAnnotationModeClick = jest.fn();
        getWrapper({ onAnnotationModeClick });

        await userEvent.click(screen.getByRole('button', { name: __('annotation_tools') }));

        expect(onAnnotationModeClick).toHaveBeenCalledWith({ mode: AnnotationMode.REGION });
    });

    test('should exit annotations and focus the markup toggle when the exit button is clicked', async () => {
        const onAnnotationModeClick = jest.fn();
        getWrapper({ annotationMode: AnnotationMode.DRAWING, onAnnotationModeClick });

        await userEvent.click(screen.getByRole('button', { name: __('exit_annotations') }));

        expect(onAnnotationModeClick).toHaveBeenCalledWith({ mode: AnnotationMode.NONE });
        expect(screen.getByRole('button', { name: __('annotation_tools') })).toHaveFocus();
    });
});
