import get from 'lodash/get';

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
