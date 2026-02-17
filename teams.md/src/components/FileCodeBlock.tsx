import { useEffect, useState, PropsWithChildren } from 'react';
import CodeBlock from '@theme/CodeBlock';
import useBaseUrl from '@docusaurus/useBaseUrl';

export type FileCodeBlockParams = {
  readonly src: string;
  readonly lang?: string;
};

export default function FileCodeBlock({ src, lang }: PropsWithChildren<FileCodeBlockParams>) {
  const [code, setCode] = useState<string>();
  const url = useBaseUrl(src);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(url);

        if (!res.ok || res.status != 200) {
          throw new Error(`failed to load file code block with status "${res.status}"`);
        }

        const blob = await res.blob();
        const data = await blob.text();
        setCode(data.trim());
      } catch (err) {
        console.error('failed to load file code block', err);
      }
    })();
  }, [src]);

  return (
    <CodeBlock title={process.env.NODE_ENV === 'development' ? src : undefined} language={lang}>
      {code}
    </CodeBlock>
  );
}
