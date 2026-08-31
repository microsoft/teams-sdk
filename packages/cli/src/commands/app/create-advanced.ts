import { checkbox, select } from '@inquirer/prompts';
import {
  collectManifestCustomization,
  isManifestCustomizationField,
  MANIFEST_CUSTOMIZATION_CHOICES,
  type ManifestCustomization,
  type ManifestCustomizationField,
} from '../../apps/index.js';
import { isInteractive } from '../../utils/interactive.js';

export const SIGN_IN_AUDIENCE_BY_OPTION = {
  myOrg: 'AzureADMyOrg',
  multipleOrgs: 'AzureADMultipleOrgs',
} as const;

export type SignInAudienceOption = keyof typeof SIGN_IN_AUDIENCE_BY_OPTION;

export interface AppCreateAdvancedOptions {
  manifest: ManifestCustomization;
  appRegistration?: {
    signInAudience: SignInAudienceOption;
  };
}

type AdvancedOption = ManifestCustomizationField | 'appRegistration';

export function isSignInAudienceOption(value: string): value is SignInAudienceOption {
  return Object.prototype.hasOwnProperty.call(SIGN_IN_AUDIENCE_BY_OPTION, value);
}

export async function collectCreateAdvancedOptions(): Promise<AppCreateAdvancedOptions> {
  if (!isInteractive()) {
    return { manifest: {} };
  }

  const advancedOptions = await checkbox<AdvancedOption>({
    message: 'Advanced options? (space to select, enter to continue)',
    choices: [
      ...MANIFEST_CUSTOMIZATION_CHOICES,
      { name: 'App registration', value: 'appRegistration' },
    ],
  });

  const result: AppCreateAdvancedOptions = { manifest: {} };
  const manifestFields = advancedOptions.filter(isManifestCustomizationField);

  if (manifestFields.length > 0) {
    result.manifest = await collectManifestCustomization(manifestFields);
  }

  if (advancedOptions.includes('appRegistration')) {
    result.appRegistration = {
      signInAudience: await select<SignInAudienceOption>({
        message: 'Audience:',
        default: 'multipleOrgs',
        choices: [
          { name: 'Multiple organizations', value: 'multipleOrgs' },
          { name: 'My organization only', value: 'myOrg' },
        ],
      }),
    };
  }

  return result;
}
