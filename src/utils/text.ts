/**
 * Strip basic markdown formatting characters (** for bold, * for italic, etc.)
 * so chat messages and TTS read cleanly.
 */
export function stripMarkdown(text: string): string {
  if (!text) return "";
  return (
    text
      // Bold: **text** or __text__
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      // Italic: *text* or _text_  (avoid matching list bullets at line start)
      .replace(/(^|[^\*])\*([^\*\n]+)\*/g, "$1$2")
      .replace(/(^|[^_])_([^_\n]+)_/g, "$1$2")
      // Inline code: `text`
      .replace(/`([^`]+)`/g, "$1")
      // Headings: ### Title
      .replace(/^#{1,6}\s+/gm, "")
      // Stray asterisks
      .replace(/\*+/g, "")
      .trim()
  );
}
