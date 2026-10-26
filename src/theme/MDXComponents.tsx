import MDXComponents from "@theme-original/MDXComponents";
import type { ComponentProps } from "react";
import FieldCard from "@site/src/components/FieldCard";
import DiagramImage from "@site/src/components/DiagramImage";

export default {
  ...MDXComponents,
  FieldCard,
  img: DiagramImage,
  table: (props: ComponentProps<"table">) => <table tabIndex={0} {...props} />,
};
