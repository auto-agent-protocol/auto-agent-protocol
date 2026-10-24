import type { ComponentProps } from "react";
import OriginalImage from "@theme-original/MDXComponents/Img";
import styles from "./styles.module.css";

export default function DiagramImage(
  props: ComponentProps<"img">,
): JSX.Element {
  if (!props.src?.endsWith(".svg")) return <OriginalImage {...props} />;
  return (
    <span className={styles.diagram}>
      <a
        href={props.src}
        target="_blank"
        rel="noopener"
        aria-label={`Open full-size diagram: ${props.alt ?? "AAP diagram"}`}
      >
        <OriginalImage {...props} loading={props.loading ?? "eager"} />
        <span className={styles.expand}>
          Open full-size diagram <span aria-hidden="true">↗</span>
        </span>
      </a>
    </span>
  );
}
