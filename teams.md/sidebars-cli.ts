import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

export default {
  cliSidebar: [
    {
      type: 'doc',
      id: 'index',
      label: 'Overview',
    },
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/authentication',
        'getting-started/quickstart',
      ],
    },
    {
      type: 'category',
      label: 'Commands',
      collapsed: false,
      items: [
        'commands/index',
        'commands/login',
        'commands/logout',
        'commands/status',
        {
          type: 'category',
          label: 'app',
          collapsed: false,
          items: [
            'commands/app/index',
            'commands/app/list',
            'commands/app/create',
            'commands/app/get',
            'commands/app/update',
            'commands/app/doctor',
            'commands/app/manifest',
            'commands/app/manifest-download',
            'commands/app/manifest-upload',
            'commands/app/package',
            'commands/app/package-download',
            'commands/app/bot',
            'commands/app/bot-get',
            'commands/app/bot-migrate',
            'commands/app/auth',
            'commands/app/auth-secret',
            'commands/app/auth-secret-create',
            'commands/app/rsc',
            'commands/app/rsc-list',
            'commands/app/rsc-add',
            'commands/app/rsc-remove',
            'commands/app/rsc-set',
          ],
        },
        {
          type: 'category',
          label: 'project',
          collapsed: true,
          items: [
            'commands/project/index',
            'commands/project/new',
            'commands/project/new-typescript',
            'commands/project/new-csharp',
            'commands/project/new-python',
          ],
        },
        {
          type: 'category',
          label: 'config',
          collapsed: true,
          items: [
            'commands/config/index',
            'commands/config/get',
            'commands/config/set',
          ],
        },
        'commands/self-update',
      ],
    },
    {
      type: 'category',
      label: 'Concepts',
      items: [
        'concepts/bot-locations',
        'concepts/local-tunnels',
        'concepts/aad-apps',
        'concepts/tdp-portal',
        'concepts/sso-architecture',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: ['guides/user-authentication-setup'],
    },
  ],
} satisfies SidebarsConfig;
