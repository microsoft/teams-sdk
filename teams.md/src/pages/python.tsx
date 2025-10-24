import { Redirect } from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function Python() {
  const baseUrl = useBaseUrl('/');
  return <Redirect to={`${baseUrl}python/getting-started`} />;
}
