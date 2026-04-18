import React from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import { HtmlClassNameProvider, ThemeClassNames, PageMetadata } from '@docusaurus/theme-common';
import clsx from 'clsx';
import type { Props } from '@theme/BlogTagsListPage';

export default function BlogTagsListPage({ tags }: Props): React.ReactNode {
    const sorted = [...tags].sort((a, b) => b.count - a.count);

    return (
        <HtmlClassNameProvider className={clsx(ThemeClassNames.wrapper.blogPages, ThemeClassNames.page.blogTagsListPage)}>
            <PageMetadata title="Topics — Teams SDK Blog" />
            <Layout>
                <div className="sdev-blog">
                    <aside className="sdev-blog__sidebar">
                        <div className="sdev-blog__filter-label">/ TOPICS</div>
                        <div className="sdev-blog__divider" />
                        <Link to="/blog" className="sdev-blog__tag-back">← all posts</Link>
                    </aside>

                    <main className="sdev-blog__main">
                        <div className="sdev-blog__table-head">
                            <span className="sdev-blog__th sdev-blog__th--date">/ COUNT</span>
                            <span className="sdev-blog__th sdev-blog__th--name">/ TOPIC</span>
                        </div>

                        {sorted.map((tag) => (
                            <Link key={tag.permalink} to={tag.permalink} className="sdev-blog__tags-row">
                                <span className="sdev-blog__bullet" />
                                <span className="sdev-blog__date">{String(tag.count).padStart(2, '0')}</span>
                                <span className="sdev-blog__tags-name">{tag.label}</span>
                            </Link>
                        ))}
                    </main>
                </div>
            </Layout>
        </HtmlClassNameProvider>
    );
}
