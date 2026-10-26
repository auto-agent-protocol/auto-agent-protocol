import { parse as parseYaml } from "yaml";

export interface MarkdownDoc {
  title: string;
  description: string;
  body: string;
}

export function parseDoc(source: string, fallbackTitle: string): MarkdownDoc {
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const metadata = frontmatter
    ? ((parseYaml(frontmatter[1]) ?? {}) as Record<string, unknown>)
    : {};
  return {
    title: typeof metadata.title === "string" ? metadata.title : fallbackTitle,
    description:
      typeof metadata.description === "string" ? metadata.description : "",
    body: frontmatter ? source.slice(frontmatter[0].length) : source,
  };
}

export function readableMarkdown(body: string, pageUrl: string): string {
  let fence: { character: string; length: number } | undefined;
  const result = body.split("\n").map((line) => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      const character = marker[1][0],
        length = marker[1].length;
      if (!fence) fence = { character, length };
      else if (
        character === fence.character &&
        length >= fence.length &&
        !line.slice(marker[0].length).trim()
      )
        fence = undefined;
      return line;
    }
    if (fence) return line;
    if (
      /^\s*\{\/\*.*\*\/\}\s*$/.test(line) ||
      /^\s*<\/?details(?:\s[^>]*)?>\s*$/.test(line)
    )
      return "";
    if (/^:::\s*$/.test(line)) return "";
    return line
      .replace(
        /^:::(\w+)(?:\[([^\]]+)\]|[ \t]+(.*))?$/,
        (_match, type: string, bracketTitle: string, title: string) =>
          `**${type[0].toUpperCase()}${type.slice(1)}${bracketTitle || title ? `: ${bracketTitle || title}` : ""}**`,
      )
      .replace(/<summary>(.*?)<\/summary>/g, "**$1**")
      .replace(
        /(!?\[[^\]]*\])\(([^\s)]+)(\s+"[^"]*")?\)/g,
        (_match, text: string, target: string, title = "") =>
          `${text}(${new URL(target, pageUrl).href}${title})`,
      );
  });
  return result.join("\n").trim();
}
