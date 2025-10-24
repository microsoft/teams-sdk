import { Redirect } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function Typescript() {
  const baseUrl = useBaseUrl('/');
  return <Redirect to={`${baseUrl}typescript/getting-started`} />;
}
