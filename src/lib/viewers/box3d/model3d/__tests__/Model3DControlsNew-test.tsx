import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Model3DControls, { Props } from '../Model3DControlsNew';
import ControlsLayer, { SHOW_CLASSNAME } from '../../../controls/controls-layer';
import { CameraProjection, RenderMode } from '../../../controls/box3d/Model3DSettings';

// react-tether positions against layout (findDOMNode) which jsdom can't provide;
// render its target/element inline so the coach-mark content is assertable.
jest.mock('react-tether', () => ({ children }: { children: React.ReactNode }) => <>{children}</>);

const getDefaultProps = (): Props => ({
    animationClips: [],
    annotationColor: '#0061d5',
    cameraProjection: CameraProjection.PERSPECTIVE,
    currentAnimationClipId: '',
    isCommentModeActive: false,
    isDrawModeActive: false,
    isPanModeActive: false,
    isPlaying: false,
    isVersionDiffActive: false,
    isVrShown: false,
    isWatermarkActive: false,
    onAnimationClipSelect: jest.fn(),
    onAnnotationColorChange: jest.fn(),
    onCameraProjectionChange: jest.fn(),
    onCommentToggle: jest.fn(),
    onDrawToggle: jest.fn(),
    onFullscreenToggle: jest.fn(),
    onPanToggle: jest.fn(),
    onPlayPause: jest.fn(),
    onRenderModeChange: jest.fn(),
    onReset: jest.fn(),
    onSettingsClose: jest.fn(),
    onSettingsOpen: jest.fn(),
    onShowEnvironmentToggle: jest.fn(),
    onShowGridToggle: jest.fn(),
    onShowLightsToggle: jest.fn(),
    onShowWireframesToggle: jest.fn(),
    onVersionDiffToggle: jest.fn(),
    onVrToggle: jest.fn(),
    onWatermarkToggle: jest.fn(),
    onZoomIn: jest.fn(),
    onZoomOut: jest.fn(),
    renderMode: RenderMode.LIT,
    scale: 1,
    showEnvironment: true,
    showGrid: true,
    showLights: true,
    showWireframes: false,
});

describe('lib/viewers/box3d/model3d/Model3DControlsNew', () => {
    describe('render()', () => {
        test('should render valid output', async () => {
            const user = userEvent.setup();
            const onReset = jest.fn();
            const onPlayPause = jest.fn();
            const onAnimationClipSelect = jest.fn();
            const onFullscreenToggle = jest.fn();
            const onVrToggle = jest.fn();
            const onSettingsOpen = jest.fn();
            render(
                <Model3DControls
                    animationClips={[
                        {
                            duration: 2,
                            id: '123',
                            name: 'foo',
                        },
                    ]}
                    annotationColor="#0061d5"
                    cameraProjection={CameraProjection.PERSPECTIVE}
                    currentAnimationClipId="123"
                    isCommentModeActive={false}
                    isDrawModeActive={false}
                    isPanModeActive={false}
                    isPlaying={false}
                    isVersionDiffActive={false}
                    isVrShown
                    isWatermarkActive={false}
                    onAnimationClipSelect={onAnimationClipSelect}
                    onAnnotationColorChange={jest.fn()}
                    onCameraProjectionChange={jest.fn()}
                    onCommentToggle={jest.fn()}
                    onDrawToggle={jest.fn()}
                    onFullscreenToggle={onFullscreenToggle}
                    onPanToggle={jest.fn()}
                    onPlayPause={onPlayPause}
                    onRenderModeChange={jest.fn()}
                    onReset={onReset}
                    onSettingsClose={jest.fn()}
                    onSettingsOpen={onSettingsOpen}
                    onShowEnvironmentToggle={jest.fn()}
                    onShowGridToggle={jest.fn()}
                    onShowLightsToggle={jest.fn()}
                    onShowWireframesToggle={jest.fn()}
                    onVersionDiffToggle={jest.fn()}
                    onVrToggle={onVrToggle}
                    onWatermarkToggle={jest.fn()}
                    onZoomIn={jest.fn()}
                    onZoomOut={jest.fn()}
                    renderMode={RenderMode.LIT}
                    scale={1}
                    showEnvironment
                    showGrid
                    showLights
                    showWireframes={false}
                />,
            );

            await user.click(screen.getByTitle('Reset'));
            expect(onReset).toHaveBeenCalledTimes(1);

            await user.click(screen.getByTitle('Play'));
            expect(onPlayPause).toHaveBeenCalledTimes(1);

            await user.click(screen.getByTitle('Animation clips'));
            const animationClip = screen.getByRole('menuitemradio');
            expect(animationClip).toHaveTextContent('00:00:02 foo');

            await user.click(animationClip);
            expect(onAnimationClipSelect).toHaveBeenCalledTimes(1);

            await user.click(screen.getByTitle('Enter fullscreen'));
            expect(onFullscreenToggle).toHaveBeenCalledTimes(1);

            await user.click(screen.getByTitle('Toggle VR display'));
            expect(onVrToggle).toHaveBeenCalledTimes(1);

            await user.click(screen.getByTitle('Settings'));
            expect(onSettingsOpen).toHaveBeenCalledTimes(1);
        });

        test('should show color picker when draw mode is active', () => {
            render(
                <Model3DControls
                    animationClips={[]}
                    annotationColor="#ed3757"
                    cameraProjection={CameraProjection.PERSPECTIVE}
                    currentAnimationClipId=""
                    isCommentModeActive={false}
                    isDrawModeActive
                    isPanModeActive={false}
                    isPlaying={false}
                    isVersionDiffActive={false}
                    isVrShown={false}
                    isWatermarkActive={false}
                    onAnimationClipSelect={jest.fn()}
                    onAnnotationColorChange={jest.fn()}
                    onCameraProjectionChange={jest.fn()}
                    onCommentToggle={jest.fn()}
                    onDrawToggle={jest.fn()}
                    onFullscreenToggle={jest.fn()}
                    onPanToggle={jest.fn()}
                    onPlayPause={jest.fn()}
                    onRenderModeChange={jest.fn()}
                    onReset={jest.fn()}
                    onSettingsClose={jest.fn()}
                    onSettingsOpen={jest.fn()}
                    onShowEnvironmentToggle={jest.fn()}
                    onShowGridToggle={jest.fn()}
                    onShowLightsToggle={jest.fn()}
                    onShowWireframesToggle={jest.fn()}
                    onVersionDiffToggle={jest.fn()}
                    onVrToggle={jest.fn()}
                    onWatermarkToggle={jest.fn()}
                    onZoomIn={jest.fn()}
                    onZoomOut={jest.fn()}
                    renderMode={RenderMode.LIT}
                    scale={1}
                    showEnvironment
                    showGrid
                    showLights
                    showWireframes={false}
                />,
            );

            expect(screen.getByTestId('bp-color-picker-control')).toBeInTheDocument();
        });

        test('should hide color picker when draw mode is inactive', () => {
            render(
                <Model3DControls
                    animationClips={[]}
                    annotationColor="#ed3757"
                    cameraProjection={CameraProjection.PERSPECTIVE}
                    currentAnimationClipId=""
                    isCommentModeActive={false}
                    isDrawModeActive={false}
                    isPanModeActive={false}
                    isPlaying={false}
                    isVersionDiffActive={false}
                    isVrShown={false}
                    isWatermarkActive={false}
                    onAnimationClipSelect={jest.fn()}
                    onAnnotationColorChange={jest.fn()}
                    onCameraProjectionChange={jest.fn()}
                    onCommentToggle={jest.fn()}
                    onDrawToggle={jest.fn()}
                    onFullscreenToggle={jest.fn()}
                    onPanToggle={jest.fn()}
                    onPlayPause={jest.fn()}
                    onRenderModeChange={jest.fn()}
                    onReset={jest.fn()}
                    onSettingsClose={jest.fn()}
                    onSettingsOpen={jest.fn()}
                    onShowEnvironmentToggle={jest.fn()}
                    onShowGridToggle={jest.fn()}
                    onShowLightsToggle={jest.fn()}
                    onShowWireframesToggle={jest.fn()}
                    onVersionDiffToggle={jest.fn()}
                    onVrToggle={jest.fn()}
                    onWatermarkToggle={jest.fn()}
                    onZoomIn={jest.fn()}
                    onZoomOut={jest.fn()}
                    renderMode={RenderMode.LIT}
                    scale={1}
                    showEnvironment
                    showGrid
                    showLights
                    showWireframes={false}
                />,
            );

            expect(screen.queryByTestId('bp-color-picker-control')).not.toBeInTheDocument();
        });
    });

    describe('annotate coach-mark (upload deep-link)', () => {
        const renderInLayer = (props: Partial<Props>): HTMLElement => {
            const { container } = render(
                <ControlsLayer>
                    <Model3DControls {...getDefaultProps()} {...props} />
                </ControlsLayer>,
            );

            return container.querySelector('.bp-ControlsLayer') as HTMLElement;
        };

        test('should not show the coach-mark by default', () => {
            const layerEl = renderInLayer({ isCommentOnboardingActive: false });

            expect(screen.queryByText('Annotate your 3D model')).not.toBeInTheDocument();
            expect(layerEl).not.toHaveClass(SHOW_CLASSNAME);
        });

        test('should show the coach-mark and pin the toolbar when active on load', () => {
            const layerEl = renderInLayer({ isCommentOnboardingActive: true });

            // Coach-mark is visible over the annotate button on arrival...
            expect(screen.getByText('Annotate your 3D model')).toBeInTheDocument();
            // ...and the toolbar is forced visible (bypasses the fade-out timer) so the
            // anchored button doesn't disappear without mouse movement.
            expect(layerEl).toHaveClass(SHOW_CLASSNAME);
        });

        test('should still fire onCommentToggle when the annotate button is clicked', async () => {
            const user = userEvent.setup();
            const onCommentToggle = jest.fn();
            renderInLayer({ isCommentOnboardingActive: true, onCommentToggle });

            await user.click(screen.getByTestId('bp-CommentControl'));

            expect(onCommentToggle).toHaveBeenCalled();
        });

        test('should dismiss the coach-mark via the close button', async () => {
            const user = userEvent.setup();
            const onCommentOnboardingDismiss = jest.fn();
            renderInLayer({ isCommentOnboardingActive: true, onCommentOnboardingDismiss });

            await user.click(screen.getByLabelText('Close'));

            expect(onCommentOnboardingDismiss).toHaveBeenCalled();
            expect(screen.queryByText('Annotate your 3D model')).not.toBeInTheDocument();
        });
    });
});
