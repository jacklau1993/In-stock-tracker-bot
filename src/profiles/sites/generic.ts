import { ProfileResult, SiteProfile } from '..';

export const genericProfile: SiteProfile = {
  hosts: ['*'],
  parse(html: string): ProfileResult {
    const needsManual = /captcha|enable javascript/i.test(html);
    const signals = needsManual
      ? {
          oosTexts: ['captcha'],
        }
      : undefined;
    return { signals };
  },
};
