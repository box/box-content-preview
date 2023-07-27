import get from 'lodash/get';

type FeatureOptions = {
    [key: string]: NonNullable<unknown>;
};

type FeatureConfig = {
    [key: string]: FeatureOptions;
};

export const isFeatureEnabled = (features: FeatureConfig, featureName: string): boolean => {
    return !!get(features, featureName, false);
};

export const getFeatureConfig = (features: FeatureConfig, featureName: string): FeatureOptions => {
    return get(features, featureName, {});
};
