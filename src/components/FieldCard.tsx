import React, { type ReactNode } from "react";
import styles from "./FieldCard.module.css";

interface FieldCardProps {
  name: string;
  type: string;
  required?: boolean;
  format?: string;
  pattern?: string;
  enumValues?: (string | number)[];
  defaultValue?: unknown;
  example?: unknown;
  children?: ReactNode;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export default function FieldCard({
  name,
  type,
  required = false,
  format,
  pattern,
  enumValues,
  defaultValue,
  example,
  children,
}: FieldCardProps): JSX.Element {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <code className={styles.name}>{name}</code>
        <span className={styles.type}>{type}</span>
        {required ? (
          <span className={`${styles.flag} ${styles.required}`}>required</span>
        ) : (
          <span className={`${styles.flag} ${styles.optional}`}>optional</span>
        )}
      </div>

      {(format || pattern) && (
        <div className={styles.meta}>
          {format && (
            <span className={styles.metaItem}>
              <span className={styles.metaLabel}>format</span>
              <code>{format}</code>
            </span>
          )}
          {pattern && (
            <span className={styles.metaItem}>
              <span className={styles.metaLabel}>pattern</span>
              <code>{pattern}</code>
            </span>
          )}
        </div>
      )}

      {enumValues && enumValues.length > 0 && (
        <div className={styles.meta}>
          <span className={styles.metaLabel}>enum</span>
          <span className={styles.enumList}>
            {enumValues.map((v, i) => (
              <code key={i} className={styles.enumValue}>
                {String(v)}
              </code>
            ))}
          </span>
        </div>
      )}

      {defaultValue !== undefined && (
        <div className={styles.meta}>
          <span className={styles.metaLabel}>default</span>
          <code>{formatValue(defaultValue)}</code>
        </div>
      )}

      {children && <div className={styles.description}>{children}</div>}

      {example !== undefined && (
        <details className={styles.example}>
          <summary>Example</summary>
          <pre>{formatValue(example)}</pre>
        </details>
      )}
    </div>
  );
}
