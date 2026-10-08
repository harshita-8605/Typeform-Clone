const getAlpha2Code = (iso6392Code: string) => {
  return iso6392Code.split('-')[0];
};

const getStack = () => {
  const err = new Error();
  return err.stack?.split('\n').slice(2).join('\n');
};

/**
 * Finds the index of the preferred language from a list of available languages.
 *
 * This function helps select the best matching language based on user preferences and browser settings.
 * It's designed to work with arrays of ISO 639-2 language codes, optionally with region codes (e.g. 'en' or 'en-US'),
 * but can also be used for matching alpha3 ietf language tags, e.g. "eng".
 *
 * @param availableLanguages - Array of language codes that are available to choose from
 * @param preferredLanguages - Array of language codes to try matching
 * @returns The index of the best matching language in the availableLanguages array, or -1 if no languages are available
 *
 * @example
 * const captions = [
 *   { language: 'en', text: 'Hello' },
 *   { language: 'es', text: 'Hola' }
 * ];
 * const index = getPreferredAvailableLanguageIndex(
 *   captions.map(c => c.language),
 *   ['es']
 * );
 * const preferredCaption = captions[index];
 */
export const getPreferredAvailableLanguageIndex = (
  availableLanguages: string[],
  preferredLanguages: string[],
): number => {
  // Many of the call sites are not typescript, so are susceptible to pass in
  // non-string values. We don't want to break in that scenario, but we do want
  // to log the issue so we can fix it.
  if ((availableLanguages as unknown[]).some((lang) => typeof lang !== 'string')) {
    // eslint-disable-next-line no-console
    console.error('availableLanguages has non-string values', availableLanguages, getStack());
    // eslint-disable-next-line no-param-reassign
    availableLanguages = availableLanguages.filter((lang) => typeof lang === 'string');
  }
  if ((preferredLanguages as unknown[]).some((lang) => typeof lang !== 'string')) {
    // eslint-disable-next-line no-console
    console.error('preferredLanguages has non-string values', preferredLanguages, getStack());
    // eslint-disable-next-line no-param-reassign
    preferredLanguages = preferredLanguages.filter((lang) => typeof lang === 'string');
  }

  // eslint-disable-next-line no-restricted-syntax
  for (const preferredLanguage of preferredLanguages) {
    // Try exact matches first
    if (availableLanguages.includes(preferredLanguage)) {
      return availableLanguages.indexOf(preferredLanguage);
    }

    // Try region matches
    const preferredAlpha2 = getAlpha2Code(preferredLanguage);
    const hasRegionMatch = availableLanguages.some(
      (lang) => getAlpha2Code(lang) === preferredAlpha2,
    );

    if (hasRegionMatch) {
      return availableLanguages.findIndex((lang) => getAlpha2Code(lang) === preferredAlpha2);
    }
  }

  return -1;
};
