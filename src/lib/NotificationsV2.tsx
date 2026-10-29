import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Notification, useNotification } from '@box/blueprint-web';
import BlueprintProviders from './BlueprintProviders';
import './NotificationsV2.scss';

type NotificationApi = Pick<ReturnType<typeof useNotification>, 'addNotification' | 'removeAllNotifications'>;

export type NotificationVariant = Parameters<NotificationApi['addNotification']>[0]['variant'];

type BridgeProps = {
    onReady: (api: NotificationApi) => void;
};

const getTypeIconLabel = (variant: NotificationVariant): string => {
    switch (variant) {
        case 'error':
            return __('notification_icon_error');
        case 'success':
            return __('notification_icon_success');
        case 'warning':
            return __('notification_icon_warning');
        default:
            return __('notification_icon_info');
    }
};

function NotificationsBridge({ onReady }: BridgeProps): JSX.Element {
    const { addNotification, removeAllNotifications } = useNotification();

    React.useLayoutEffect(() => {
        onReady({ addNotification, removeAllNotifications });
    }, [addNotification, onReady, removeAllNotifications]);

    return <Notification.Viewport className="bp-NotificationsV2-viewport" />;
}

export class NotificationsV2Root {
    api: NotificationApi | null = null;

    hostEl: HTMLElement;

    isDestroyed = false;

    pending: Array<(api: NotificationApi) => void> = [];

    root: Root;

    constructor(containerEl: HTMLElement) {
        this.hostEl = document.createElement('div');
        this.hostEl.className = 'bp-NotificationsV2Root';
        containerEl.appendChild(this.hostEl);
        this.root = createRoot(this.hostEl);
        this.root.render(
            <BlueprintProviders container={this.hostEl}>
                <Notification.Provider label={__('notifications_region_label')}>
                    <NotificationsBridge onReady={this.handleReady} />
                </Notification.Provider>
            </BlueprintProviders>,
        );
    }

    destroy(): void {
        this.isDestroyed = true;
        this.api = null;
        this.pending = [];
        this.root.unmount();
        this.hostEl.remove();
    }

    hide(): void {
        this.run(api => api.removeAllNotifications());
    }

    show(message: string, buttonText?: string | null, persist = false, variant: NotificationVariant = 'info'): void {
        this.run(api =>
            api.addNotification({
                ...(persist && { duration: Infinity }),
                children: buttonText ? (
                    <Notification.Button ariaLabel={buttonText}>{buttonText}</Notification.Button>
                ) : undefined,
                closeButtonAriaLabel: __('notification_button_default_label'),
                sensitivity: 'foreground',
                styledText: message,
                typeIconAriaLabel: getTypeIconLabel(variant),
                variant,
            }),
        );
    }

    // createRoot renders asynchronously, so calls made before the provider mounts are replayed once it does.
    handleReady = (api: NotificationApi): void => {
        if (this.isDestroyed) {
            return;
        }

        this.api = api;
        const { pending } = this;
        this.pending = [];
        pending.forEach(call => call(api));
    };

    run(call: (api: NotificationApi) => void): void {
        if (this.isDestroyed) {
            return;
        }

        if (this.api) {
            call(this.api);
        } else {
            this.pending.push(call);
        }
    }
}
