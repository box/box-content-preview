import { SplitFactory } from '@splitsoftware/splitio';
import SplitIO from '@splitsoftware/splitio/types/splitio';

export const TREATMENTS = {
    ACI_ACTIVITY: 'enterprise_advanced_content_insights_activity',
};

const TREATMENT_STATES = {
    CONTROL: 'control',
    // SplitIO default value, returned when split doesn't exist
    ON: 'on',
    OFF: 'off',
};

class Split {
    isSDKReady: boolean;

    factory: SplitIO.ISDK | null;

    client: SplitIO.IClient | null;

    /**
     * SplitFactory will initialize the Split SDK and its main client, listen for its events in order to update the Split Context
     * */
    constructor(apiKey: string, key: string) {
        this.isSDKReady = false;
        this.factory = SplitFactory({
            core: {
                authorizationKey: apiKey,
                key,
            },
            startup: {
                readyTimeout: 4,
                requestTimeoutBeforeReady: 4,
            },
            scheduler: {
                impressionsRefreshRate: 20,
            },
            storage: {
                type: 'LOCALSTORAGE',
            },
        });
        this.client = this.factory.client();
        this.client.on(this.client.Event.SDK_READY, () => {
            this.isSDKReady = true;
        });
    }

    applyFeatureFlag(featureName: string): boolean | undefined {
        const treatment = this.client?.getTreatment(featureName);
        if (treatment === TREATMENT_STATES.ON) {
            return true;
        }
        if (treatment && [TREATMENT_STATES.OFF, TREATMENT_STATES.CONTROL].includes(treatment)) {
            return false;
        }
        return undefined;
    }

    destroySplit(): void {
        if (this.client) this.client.destroy();
        this.client = null;
    }
}

export default Split;
