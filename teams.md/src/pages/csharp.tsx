import { Redirect } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function CSharp() {
  const baseUrl = useBaseUrl('/');
  return <Redirect to={`${baseUrl}csharp/getting-started`} />;
}
