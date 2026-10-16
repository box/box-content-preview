import React, { useId } from 'react';
import { createRoot, Root } from 'react-dom/client';
import CheckmarkCircle from '@box/blueprint-web-assets/icons/Medium/CheckmarkCircle';
import { BoxBlue100, Size8 } from '@box/blueprint-web-assets/tokens/tokens';
import { LoadingIndicator, Modal, Text, VisuallyHidden } from '@box/blueprint-web';
import BlueprintProviders from './BlueprintProviders';
import './PrintModal.scss';

type Props = {
    buttonText: string;
    container: HTMLElement;
    isButtonDisabled: boolean;
    isOpen: boolean;
    isReady: boolean;
    message: string;
    onClose: () => void;
    onPrint: () => void;
};

export default function PrintModal({
    buttonText,
    container,
    isButtonDisabled,
    isOpen,
    isReady,
    message,
    onClose,
    onPrint,
}: Props): JSX.Element {
    const messageId = useId();

    return (
        <Modal
            onOpenChange={open => {
                if (!open) {
                    onClose();
                }
            }}
            open={isOpen}
        >
            <Modal.Content aria-describedby={messageId} container={container} size="small">
                <Modal.Header>
                    <VisuallyHidden>{__('print')}</VisuallyHidden>
                </Modal.Header>
                <Modal.ScrollableContainer>
                    <Modal.Body className="bp-PrintModal-body">
                        <div className="bp-PrintModal-status">
                            {isReady ? (
                                <CheckmarkCircle
                                    aria-hidden="true"
                                    color={BoxBlue100}
                                    data-testid="bp-PrintModal-checkmark"
                                    height={Size8}
                                    width={Size8}
                                />
                            ) : (
                                <LoadingIndicator aria-label={message} size="large" />
                            )}
                        </div>
                        <Text aria-live="polite" as="p" id={messageId} variant="bodyDefault">
                            {message}
                        </Text>
                    </Modal.Body>
                </Modal.ScrollableContainer>
                <Modal.Footer>
                    <Modal.Footer.PrimaryButton
                        data-target-id="PrintModal-print"
                        disabled={isButtonDisabled}
                        onClick={onPrint}
                    >
                        {buttonText}
                    </Modal.Footer.PrimaryButton>
                </Modal.Footer>
                <Modal.Close aria-label={__('print_close')} data-target-id="PrintModal-close" />
            </Modal.Content>
        </Modal>
    );
}

type State = Pick<Props, 'buttonText' | 'isButtonDisabled' | 'isOpen' | 'isReady' | 'message'>;

export class PrintModalRoot {
    bodyStyleObserver: MutationObserver;

    containerEl: HTMLElement;

    hostEl: HTMLElement;

    isDestroyed = false;

    printHandler: (() => void) | null = null;

    releasedBodyPointerEvents: string | null = null;

    root: Root;

    state: State = {
        buttonText: '',
        isButtonDisabled: false,
        isOpen: false,
        isReady: false,
        message: '',
    };

    constructor(containerEl: HTMLElement) {
        this.containerEl = containerEl;
        this.hostEl = document.createElement('div');
        this.hostEl.className = 'bp-PrintModalRoot';
        containerEl.appendChild(this.hostEl);
        this.root = createRoot(this.hostEl);
        this.bodyStyleObserver = new MutationObserver(this.trackBodyPointerEvents);
        this.bodyStyleObserver.observe(document.body, { attributeFilter: ['style'] });
    }

    destroy(): void {
        this.isDestroyed = true;
        this.state = { ...this.state, isOpen: false };
        this.root.unmount();
        this.hostEl.remove();

        // React defers the unmount, and so Radix's cleanup, when destroy runs during a host commit.
        queueMicrotask(() => {
            this.restoreReleasedBodyPointerEvents();
            this.bodyStyleObserver.disconnect();
        });
    }

    disableButton(): void {
        this.update({ isButtonDisabled: true });
    }

    enableButton(): void {
        this.update({ isButtonDisabled: false });
    }

    hide(): void {
        this.update({ isOpen: false });
    }

    isButtonDisabled(): boolean {
        return this.state.isButtonDisabled;
    }

    isVisible(): boolean {
        return this.state.isOpen;
    }

    show(message: string, buttonText: string, buttonHandler?: () => void): void {
        this.printHandler = buttonHandler || null;
        if (!this.state.isOpen) {
            this.releasedBodyPointerEvents = null;
        }
        this.update({ buttonText, isOpen: true, isReady: false, message });
    }

    showReady(message: string): void {
        this.update({ isButtonDisabled: false, isReady: true, message });
    }

    // Keeps the page clickable after close; Radix restores a stale body pointer-events none set by a host menu.
    // https://github.com/radix-ui/primitives/issues/3317
    trackBodyPointerEvents = (): void => {
        if (!this.state.isOpen) {
            this.restoreReleasedBodyPointerEvents();
            return;
        }

        const { pointerEvents } = document.body.style;
        this.releasedBodyPointerEvents = pointerEvents === 'none' ? null : pointerEvents;
    };

    restoreReleasedBodyPointerEvents(): void {
        const released = this.releasedBodyPointerEvents;
        this.releasedBodyPointerEvents = null;

        if (released !== null && document.body.style.pointerEvents === 'none') {
            document.body.style.pointerEvents = released;
        }
    }

    handlePrint = (): void => {
        if (this.printHandler) {
            this.printHandler();
        } else {
            this.hide();
        }
    };

    update(nextState: Partial<State>): void {
        if (this.isDestroyed) {
            return;
        }

        this.state = { ...this.state, ...nextState };
        this.root.render(
            <BlueprintProviders container={this.containerEl}>
                <PrintModal
                    {...this.state}
                    container={this.containerEl}
                    onClose={() => this.hide()}
                    onPrint={this.handlePrint}
                />
            </BlueprintProviders>,
        );
    }
}
