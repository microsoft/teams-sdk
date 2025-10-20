"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var node_path_1 = require("node:path");
var prism_react_renderer_1 = require("prism-react-renderer");
// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)
var baseUrl = '/teams-ai/';
var config = {
    title: 'Teams AI Library (v2)',
    favicon: 'img/msft-logo-48x48.png',
    // Set the production url of your site here
    url: 'https://microsoft.github.io/',
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: baseUrl,
    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: 'microsoft', // Usually your GitHub org/user name.
    projectName: 'teams-ai', // Usually your repo name.
    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',
    // Even if you don't use internationalization, you can use this field to set
    // useful metadata like html lang. For example, if your site is Chinese, you
    // may want to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: 'en',
        locales: ['en'],
    },
    markdown: {
        mermaid: true,
    },
    headTags: [
        {
            tagName: 'link',
            attributes: {
                rel: 'llms.txt',
                href: 'https://microsoft.github.io/teams-ai/llms_docs/llms.txt'
            }
        }
    ],
    scripts: [node_path_1.default.join(baseUrl, '/scripts/clarity.js')],
    presets: [
        [
            'classic',
            {
                blog: false,
                docs: {
                    routeBasePath: '/',
                    path: 'docs/main',
                    sidebarPath: './sidebars.ts',
                    sidebarCollapsed: false,
                    editUrl: 'https://github.com/microsoft/teams-ai/tree/main/teams.md/',
                },
                theme: {
                    customCss: ['./src/css/custom.css', './src/css/code-blocks.css'],
                },
            },
        ],
    ],
    plugins: [
        [
            '@docusaurus/plugin-content-docs',
            {
                id: 'typescript',
                path: 'docs/typescript',
                routeBasePath: '/typescript',
                sidebarPath: './sidebars.ts',
                sidebarCollapsed: true,
                editUrl: 'https://github.com/microsoft/teams-ai/tree/main/teams.md/',
                exclude: ["**/LLMs.md"],
            },
        ],
        [
            '@docusaurus/plugin-content-docs',
            {
                id: 'csharp',
                path: 'docs/csharp',
                routeBasePath: '/csharp',
                sidebarPath: './sidebars.ts',
                sidebarCollapsed: true,
                editUrl: 'https://github.com/microsoft/teams-ai/tree/main/teams.md/',
                exclude: ["**/observability/*", "**/LLMs.md"]
            },
        ],
        [
            '@docusaurus/plugin-content-docs',
            {
                id: 'python',
                path: 'docs/python',
                routeBasePath: '/python',
                sidebarPath: './sidebars.ts',
                sidebarCollapsed: true,
                editUrl: 'https://github.com/microsoft/teams-ai/tree/main/teams.md/',
                exclude: ["**/LLMs.md"],
            },
        ],
    ],
    themes: [
        '@docusaurus/theme-mermaid',
        [require.resolve("@easyops-cn/docusaurus-search-local"),
            /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
            ({
                hashed: true,
                language: ['en'],
                docsRouteBasePath: ['/', '/typescript', '/csharp', '/python'],
                indexDocs: true,
                indexPages: true,
                highlightSearchTermsOnTargetPage: true
            })],
    ],
    themeConfig: {
        colorMode: {
            respectPrefersColorScheme: true,
        },
        navbar: {
            title: 'Teams AI (v2)',
            hideOnScroll: true,
            logo: {
                alt: 'Teams AI (v2)',
                src: 'img/teams.png',
            },
            items: [
                {
                    to: 'typescript',
                    position: 'left',
                    label: 'Typescript',
                },
                {
                    to: 'csharp',
                    position: 'left',
                    label: 'C#',
                },
                {
                    to: 'python',
                    position: 'left',
                    label: 'Python',
                },
                {
                    href: 'https://github.com/microsoft/teams-ai/tree/main',
                    position: 'right',
                    className: 'header-github-link',
                },
            ],
        },
        footer: {
            style: 'dark',
            links: [
                {
                    title: 'Docs',
                    items: [
                        {
                            label: 'Getting Started',
                            to: '/',
                        },
                        {
                            label: 'TypeScript',
                            to: '/typescript/getting-started',
                        },
                        {
                            label: 'C#',
                            to: '/csharp/getting-started',
                        },
                        {
                            label: 'Python',
                            to: '/python/getting-started',
                        },
                        {
                            label: 'Privacy policy',
                            to: '/privacy',
                        },
                    ],
                },
                {
                    title: 'More',
                    items: [
                        {
                            label: 'GitHub',
                            href: 'https://github.com/microsoft/teams-ai/tree/main',
                        },
                        {
                            label: 'Contributing',
                            href: 'https://github.com/microsoft/teams-ai/blob/main/CONTRIBUTING.md',
                        },
                        {
                            label: 'Blog',
                            href: 'https://devblogs.microsoft.com/microsoft365dev/announcing-the-updated-teams-ai-library-and-mcp-support/',
                        },
                        {
                            label: 'Teams agent accelerator templates',
                            href: 'https://microsoft.github.io/teams-agent-accelerator-templates/',
                        },
                    ],
                },
            ],
            copyright: "Copyright \u00A9 ".concat(new Date().getFullYear(), " Microsoft Corporation. All rights reserved."),
        },
        prism: {
            theme: prism_react_renderer_1.themes.dracula,
            darkTheme: prism_react_renderer_1.themes.vsDark,
            magicComments: [
                {
                    className: 'theme-code-block-highlighted-line',
                    line: 'highlight-next-line',
                    block: {
                        start: 'highlight-start',
                        end: 'highlight-end',
                    },
                },
                {
                    className: 'code-block-error-line',
                    line: 'highlight-error-line',
                    block: {
                        start: 'highlight-error-start',
                        end: 'highlight-error-end',
                    },
                },
                {
                    className: 'code-block-success-line',
                    line: 'highlight-success-line',
                    block: {
                        start: 'highlight-success-start',
                        end: 'highlight-success-end',
                    },
                },
            ],
            additionalLanguages: [
                'typescript',
                'javascript',
                'csharp',
                'python',
                'bash',
                'markdown',
                'json',
            ],
        },
    },
};
exports.default = config;
