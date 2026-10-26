import Head from "@docusaurus/Head";
import { useDoc } from "@docusaurus/plugin-content-docs/client";
import OriginalMetadata from "@theme-original/DocItem/Metadata";

export default function DocMetadata(): JSX.Element {
  const { metadata } = useDoc();
  return (
    <>
      <OriginalMetadata />
      <Head>
        <link
          rel="alternate"
          type="text/markdown"
          href={`${metadata.permalink}.md`}
        />
      </Head>
    </>
  );
}
