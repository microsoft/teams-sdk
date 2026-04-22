import React, { memo } from 'react';
import Link from '@docusaurus/Link';
import { useVisibleBlogSidebarItems } from '@docusaurus/plugin-content-blog/client';
import type { Props } from '@theme/BlogSidebar/Desktop';
import { formatBlogDate } from '@site/src/utils/blogDate';
import { externalBlogUrls } from '@site/src/data/externalBlogUrls';

function BlogSidebarDesktop({ sidebar }: Props) {
    const items = useVisibleBlogSidebarItems(sidebar.items);

    return (
        <aside className="col col--3 sdev-sidebar__aside">
            <nav className="sdev-sidebar" aria-label="Recent blog posts">
                <div className="sdev-sidebar__header">/ RECENT</div>
                <div className="sdev-sidebar__divider" />
                <ul className="sdev-sidebar__list">
                    {items.map((item) => {
                        const dateStr = formatBlogDate(item.date);
                        const slug = item.permalink.split('/').pop() ?? '';
                        const externalUrl = externalBlogUrls[slug];
                        return (
                            <li key={item.permalink} className="sdev-sidebar__item">
                                {externalUrl
                                    ? <a href={externalUrl} className="sdev-sidebar__link" target="_blank" rel="noopener noreferrer">
                                        <span className="sdev-sidebar__bullet" />
                                        <span className="sdev-sidebar__date">{dateStr}</span>
                                        <span className="sdev-sidebar__title">{item.title}</span>
                                    </a>
                                    : <Link to={item.permalink} className="sdev-sidebar__link">
                                        <span className="sdev-sidebar__bullet" />
                                        <span className="sdev-sidebar__date">{dateStr}</span>
                                        <span className="sdev-sidebar__title">{item.title}</span>
                                    </Link>
                                }
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
}

export default memo(BlogSidebarDesktop);
