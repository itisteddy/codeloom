export const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'dev';

export type AppEnv = 'dev' | 'pilot' | 'prod';
export const APP_ENV: AppEnv = (import.meta.env.VITE_APP_ENV as AppEnv) || 'dev';
export const IS_DEV = APP_ENV === 'dev';
export const IS_PILOT = APP_ENV === 'pilot';
export const IS_PROD = APP_ENV === 'prod';

