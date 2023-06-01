import get from 'lodash/get';

type FeatureOptions = {
    [key: string]: {};
};

type FeatureConfig = {
    [key: string]: FeatureOptions;
};

export const isFeatureEnabled = (features: FeatureConfig, featureName: string): boolean => {
    return !!get(features, featureName, false);
};

export const getFeatureConfig = (features: FeatureConfig, featureName: string): FeatureConfig => {
    return get(features, featureName, {});
};
