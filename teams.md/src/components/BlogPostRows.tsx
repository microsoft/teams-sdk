import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import { formatBlogDate } from '../utils/blogDate';

const SITE_BASE = 'https://microsoft.github.io/teams-sdk';

type BlogItem = {
    content: {
        metadata: {
            permalink: string;
            title: string;
            date: string;
            description?: string;
            authors: Array<{ name?: string }>;
            frontMatter: Record<string, unknown>;
        };
    };
};

type Props = {
    items: readonly BlogItem[];
};

export default function BlogPostRows({ items }: Props) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [copyState, setCopyState] = useState<Record<string, 'idle' | 'copying' | 'copied'>>({});

    const toggleRow = (permalink: string) =>
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(permalink) ? next.delete(permalink) : next.add(permalink);
            return next;
        });

    const handleCopy = async (permalink: string, rawContent: string | undefined, title: string, description: string) => {
        setCopyState((prev) => ({ ...prev, [permalink]: 'copying' }));
        const publicUrl = `${SITE_BASE}${permalink}`;
        const body = rawContent?.trim() || description || '';
        const text = `# ${title}\n\n${body}\n\nSource: ${publicUrl}`;
        try {
            await navigator.clipboard.writeText(text);
        } catch (e) {
            console.warn('Copy to clipboard failed', e);
        }
        setCopyState((prev) => ({ ...prev, [permalink]: 'copied' }));
        setTimeout(() => setCopyState((prev) => ({ ...prev, [permalink]: 'idle' })), 2000);
    };

    return (
        <>
            {items.map(({ content }) => {
                const { permalink, title, date, description, authors, frontMatter } = content.metadata;
                const externalUrl = frontMatter?.external_url as string | undefined;
                const rawContent = (content as any).rawContent as string | undefined;
                const dateStr = formatBlogDate(date);
                const isOpen = expanded.has(permalink);
                const authorNames = authors.map((a) => a.name).filter(Boolean);
                const state = copyState[permalink] ?? 'idle';
                const shareUrl = encodeURIComponent(`${SITE_BASE}${permalink}`);

                return (
                    <div key={permalink} className={clsx('sdev-blog__entry', isOpen && 'sdev-blog__entry--open')}>
                        <div className="sdev-blog__row" onClick={() => toggleRow(permalink)}>
                            <span className="sdev-blog__bullet" />
                            <span className="sdev-blog__date">{dateStr}</span>
                            {externalUrl
                                ? <a href={externalUrl} className="sdev-blog__title" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{title}</a>
                                : <Link to={permalink} className="sdev-blog__title" onClick={(e) => e.stopPropagation()}>{title}</Link>
                            }
                            <button
                                className="sdev-blog__plus"
                                onClick={(e) => { e.stopPropagation(); toggleRow(permalink); }}
                                aria-expanded={isOpen}
                                aria-label={isOpen ? 'Collapse post details' : 'Expand post details'}>
                                <svg className={clsx('sdev-blog__chevron', isOpen && 'sdev-blog__chevron--open')} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>
                        </div>

                        {isOpen && (
                            <div className="sdev-blog__panel">
                                <div className="sdev-blog__panel-body">
                                    <div className="sdev-blog__panel-left">
                                        {description && (
                                            <div className="sdev-blog__panel-section">
                                                <span className="sdev-blog__panel-label">SUMMARY :</span>
                                                <p className="sdev-blog__panel-summary">{description}</p>
                                            </div>
                                        )}
                                        {authorNames.length > 0 && (
                                            <div className="sdev-blog__panel-section">
                                                <span className="sdev-blog__panel-label">AUTHOR :</span>
                                                <span className="sdev-blog__panel-author">{authorNames.join(', ')}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="sdev-blog__panel-right">
                                        <div className="sdev-blog__panel-section">
                                            <span className="sdev-blog__panel-label">AGENTS :</span>
                                            <div className="sdev-blog__agents-actions">
                                                <button
                                                    className="sdev-blog__agent-btn"
                                                    disabled={state === 'copying'}
                                                    onClick={(e) => { e.stopPropagation(); handleCopy(permalink, rawContent, title, description ?? ''); }}>
                                                    {state === 'copied' ? 'Copied!' : state === 'copying' ? '...' : 'Copy for LLM'}
                                                </button>
                                                <button
                                                    className="sdev-blog__agent-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const text = rawContent?.trim() || description || '';
                                                        const md = `# ${title}\n\n${text}\n\nSource: ${SITE_BASE}${permalink}`;
                                                        const blob = new Blob([md], { type: 'text/plain' });
                                                        const url = URL.createObjectURL(blob);
                                                        const a = document.createElement('a');
                                                        a.href = url;
                                                        a.target = '_blank';
                                                        a.rel = 'noopener noreferrer';
                                                        a.click();
                                                        URL.revokeObjectURL(url);
                                                    }}>
                                                    View as Markdown
                                                </button>
                                            </div>
                                        </div>
                                        <div className="sdev-blog__panel-section">
                                            <span className="sdev-blog__panel-label">SHARE :</span>
                                            <div className="sdev-blog__agents-actions">
                                                <a
                                                    className="sdev-blog__agent-btn"
                                                    href={`https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${shareUrl}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}>
                                                    X
                                                </a>
                                                <a
                                                    className="sdev-blog__agent-btn"
                                                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}>
                                                    LinkedIn
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );
}
