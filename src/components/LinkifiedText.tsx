import React from 'react';
import { LinkItUrl } from 'react-linkify-it';

interface LinkifiedTextProps {
  children: string;
  className?: string;
}

/**
 * Component that parses markdown-style links [text](url) and automatically linkifies plain URLs.
 * 
 * Examples:
 * - "[Discord](https://discord.gg/xyz)" -> renders "Discord" as a link
 * - "https://example.com" -> auto-linkifies the URL
 * - "Join [our Discord](https://discord.gg/xyz) or visit https://twitter.com" -> renders both
 */
export const LinkifiedText: React.FC<LinkifiedTextProps> = ({ children, className = '' }) => {
  const parseText = (text: string): React.ReactNode[] => {
    // Combined matcher: markdown image ![alt](url) OR markdown link [text](url)
    // Image syntax must be tested first because it differs only by the leading '!'.
    const tokenRegex = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = tokenRegex.exec(text)) !== null) {
      // Add text before the token (with auto-linkify for plain URLs)
      if (match.index > lastIndex) {
        const textBefore = text.slice(lastIndex, match.index);
        elements.push(
          <LinkItUrl key={`text-${key++}`} className={className}>
            {textBefore}
          </LinkItUrl>
        );
      }

      const isImage = match[0].startsWith('!');
      const altOrLabel = (isImage ? match[1] : match[3]) ?? '';
      let url = (isImage ? match[2] : match[4]) ?? '';

      // Ensure URL has a protocol (http:// or https://)
      const lowerUrl = url.toLowerCase();
      if (
        !lowerUrl.startsWith('http://') &&
        !lowerUrl.startsWith('https://') &&
        !lowerUrl.startsWith('/')
      ) {
        url = 'https://' + url;
      }

      if (isImage) {
        elements.push(
          <img
            key={`img-${key++}`}
            src={url}
            alt={altOrLabel}
            className="my-2 rounded-lg max-h-48 w-auto object-cover"
            loading="lazy"
          />
        );
      } else {
        elements.push(
          <a
            key={`link-${key++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${className} underline hover:opacity-80`}
          >
            {altOrLabel}
          </a>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text (with auto-linkify for plain URLs)
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      elements.push(
        <LinkItUrl key={`text-${key++}`} className={className}>
          {remainingText}
        </LinkItUrl>
      );
    }

    // If no markdown links were found, just return the text with auto-linkify
    if (elements.length === 0) {
      return [
        <LinkItUrl key="text-0" className={className}>
          {text}
        </LinkItUrl>,
      ];
    }

    return elements;
  };

  return <>{parseText(children)}</>;
};
