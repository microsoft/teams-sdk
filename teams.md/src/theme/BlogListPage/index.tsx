import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import { HtmlClassNameProvider, ThemeClassNames, PageMetadata } from '@docusaurus/theme-common';
import clsx from 'clsx';
import type { Props } from '@theme/BlogListPage';
import BlogPostRows from '@site/src/components/BlogPostRows';
import { formatBlogDate } from '@site/src/utils/blogDate';

const HIDDEN_FILTER_TAGS = new Set([
    'teams-sdk', 'teams-ai-library', 'microsoft-teams', 'microsoft-365-developer',
    'custom-engine-agents', 'declarative-agents', 'copilot-agents', 'copilot', 'build-2024',
    'live-event',
]);
const TAG_ALIASES: Record<string, string> = { 'azure-ai': 'azure-openai' };

function normalizeTag(label: string): string {
    return TAG_ALIASES[label] ?? label;
}

export default function BlogListPage({ items, metadata }: Props): React.ReactNode {
    const tagMap: Record<string, { count: number; permalink: string }> = {};
    items.forEach(({ content }) => {
        content.metadata.tags.forEach((tag) => {
            const label = normalizeTag(tag.label);
            if (HIDDEN_FILTER_TAGS.has(label)) return;
            if (!tagMap[label]) tagMap[label] = { count: 0, permalink: tag.permalink };
            tagMap[label].count++;
        });
    });
    const allTags = Object.entries(tagMap).sort((a, b) => a[0].localeCompare(b[0]));

    const [selected, setSelected] = useState<Set<string>>(new Set());

    const toggleFilter = (label: string) =>
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(label) ? next.delete(label) : next.add(label);
            return next;
        });

    const filtered = selected.size === 0
        ? items
        : items.filter(({ content }) =>
              content.metadata.tags.some((t) => selected.has(normalizeTag(t.label))),
          );

    const hero = filtered[0];
    const rest = filtered.slice(1);

    let heroNode: React.ReactNode = null;
    if (hero) {
        const { permalink, title, date, description, authors, frontMatter } = hero.content.metadata;
        const externalUrl = frontMatter?.external_url as string | undefined;
        const authorNames = authors.map((a) => a.name).filter(Boolean);
        const dateStr = formatBlogDate(date);
        const sharedProps = { className: 'sdev-blog__hero-post' };
        const inner = (
            <>
                <div className="sdev-blog__hero-post-label">/ LATEST</div>
                <div className="sdev-blog__hero-post-date">{dateStr}</div>
                <h2 className="sdev-blog__hero-post-title">{title}</h2>
                {description && <p className="sdev-blog__hero-post-desc">{description}</p>}
                <div className="sdev-blog__hero-post-footer">
                    {authorNames.length > 0 && <span className="sdev-blog__hero-post-author">{authorNames.join(', ')}</span>}
                    <span className="sdev-blog__hero-post-read">Read →</span>
                </div>
            </>
        );
        heroNode = externalUrl
            ? <a {...sharedProps} href={externalUrl} target="_blank" rel="noopener noreferrer">{inner}</a>
            : <Link {...sharedProps} to={permalink}>{inner}</Link>;
    }

    return (
        <HtmlClassNameProvider
            className={clsx(ThemeClassNames.wrapper.blogPages, ThemeClassNames.page.blogListPage)}>
            <PageMetadata title={metadata.blogTitle} description={metadata.blogDescription} />
            <Layout>
                <div className="sdev-blog">
                    <aside className="sdev-blog__sidebar">
                        <div className="sdev-blog__filter-label">/ FILTERS</div>
                        <div className="sdev-blog__divider" />
                        {allTags.length > 0 && (
                            <div className="sdev-blog__filter-group">
                                <div className="sdev-blog__filter-group-label">
                                    <span className="sdev-blog__filter-folder">🗂</span> Topic
                                </div>
                                {allTags.map(([label, { count }]) => (
                                    <label key={label} className="sdev-blog__filter-item">
                                        <input
                                            type="checkbox"
                                            className="sdev-blog__checkbox"
                                            checked={selected.has(label)}
                                            onChange={() => toggleFilter(label)}
                                        />
                                        <span className="sdev-blog__filter-text">
                                            {label} <span className="sdev-blog__filter-count">({count})</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </aside>

                    <main className="sdev-blog__main">
                        {filtered.length === 0 && (
                            <div className="sdev-blog__empty">No posts match the selected filters.</div>
                        )}

                        {heroNode}

                        {rest.length > 0 && (
                            <>
                                <div className="sdev-blog__table-head">
                                    <span className="sdev-blog__th sdev-blog__th--date">/ DATE</span>
                                    <span className="sdev-blog__th sdev-blog__th--name">/ TITLE</span>
                                </div>
                                <BlogPostRows items={rest} />
                            </>
                        )}
                    </main>
                </div>
            </Layout>
        </HtmlClassNameProvider>
    );
}
