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
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = markdownLinkRegex.exec(text)) !== null) {
      // Add text before the markdown link (with auto-linkify for plain URLs)
      if (match.index > lastIndex) {
        const textBefore = text.slice(lastIndex, match.index);
        elements.push(
          <LinkItUrl key={`text-${key++}`} className={className}>
            {textBefore}
          </LinkItUrl>
        );
      }

      // Add the markdown link with custom text
      const linkText = match[1];
      let url = match[2];
      
      // Ensure URL has a protocol (http:// or https://)
      const lowerUrl = url.toLowerCase();
      if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      elements.push(
        <a
          key={`link-${key++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${className} hover:underline`}
        >
          {linkText}
        </a>
      );

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
        </LinkItUrl>
      ];
    }

    return elements;
  };

  return <>{parseText(children)}</>;
};
