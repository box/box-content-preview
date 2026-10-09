import get from 'lodash/get';
import {
    BLUEPRINT_MIGRATION_ARCHIVE,
    BLUEPRINT_MIGRATION_CONTROLS_BAR,
    BLUEPRINT_MIGRATION_MEDIA_CONTROLS,
    BLUEPRINT_MIGRATION_SUPPORTING_UI,
} from './constants';

export type FeatureOptions = {
    [key: string]: NonNullable<unknown>;
};

export type FeatureConfig = {
    [key: string]: FeatureOptions;
};

export const isFeatureEnabled = (features: FeatureConfig, featureName: string): boolean => {
    return !!get(features, featureName, false);
};

export const getFeatureConfig = (features: FeatureConfig, featureName: string): FeatureOptions => {
    return get(features, featureName, {});
};

// Every React root gates Blueprint providers on this rather than on its own wave's flag, so a
// Blueprint surface from any wave always has its providers, whichever root it renders in.
export const isBlueprintEnabled = (features: FeatureConfig): boolean =>
    [
        BLUEPRINT_MIGRATION_ARCHIVE,
        BLUEPRINT_MIGRATION_CONTROLS_BAR,
        BLUEPRINT_MIGRATION_MEDIA_CONTROLS,
        BLUEPRINT_MIGRATION_SUPPORTING_UI,
    ].some(feature => isFeatureEnabled(features, feature));
