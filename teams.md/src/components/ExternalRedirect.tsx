import { useEffect } from 'react';
import { useBlogPost } from '@docusaurus/plugin-content-blog/client';

export default function ExternalRedirect({ to }: { to: string }) {
    const { isBlogPostPage } = useBlogPost();

    useEffect(() => {
        if (isBlogPostPage) {
            window.location.replace(to);
        }
    }, [to, isBlogPostPage]);

    if (!isBlogPostPage) {
        return null;
    }

    return (
        <p>
            Redirecting to <a href={to}>{to}</a>…
        </p>
    );
}
