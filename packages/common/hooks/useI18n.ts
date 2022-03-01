import { createContext, useContext } from 'react';
import { template, templateSettings } from 'lodash-es';

export const LocaleContext = createContext<'en' | 'zh'>('en');
export const useLocale= () => useContext(LocaleContext);

const useI18n = <T extends Record<'en' | 'zh', Record<string, string>>>(transitions: T): T['en' | 'zh'] => {
    const locale = useContext(LocaleContext);
    return transitions[locale];
}

templateSettings.interpolate = /{([\s\S]+?)}/g;
export const compiled = (str: string, params: Record<string, string>) => template(str)(params);

export default useI18n;