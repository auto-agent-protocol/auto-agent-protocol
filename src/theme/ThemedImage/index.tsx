import React from 'react';
import {ThemedComponent} from '@docusaurus/theme-common';
import type {Props} from '@theme/ThemedImage';

export default function ThemedImage({sources, className, ...props}: Props): JSX.Element {
  return (
    <ThemedComponent className={className}>
      {({theme, className: themedClassName}) => {
        const src = sources[theme];
        const wordmark = /\/img\/brand\/aap-wordmark(?:-white)?\.png$/.test(src);
        const srcSet = wordmark
          ? [
              ...[238, 298, 476, 596, 714, 894].map(
                width => `${src.replace(/\.png$/, `-${width}.png`)} ${width}w`,
              ),
              `${src} 2380w`,
            ].join(', ')
          : props.srcSet;
        return (
          <img
            {...props}
            className={themedClassName}
            src={src}
            srcSet={srcSet}
            sizes={wordmark ? `${props.width ?? 238}px` : props.sizes}
          />
        );
      }}
    </ThemedComponent>
  );
}
