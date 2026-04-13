export interface TextChunk {
  kind: string;
  label: string;
  excerpt: string;
  sectionPath: string | null;
}

const MAX_CHUNK_CHARS = 600;
const MIN_CHUNK_CHARS = 80;

function splitBySentences(text: string): string[] {
  // Split on period/exclamation/question followed by space or end of string
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function splitLongParagraph(para: string): string[] {
  if (para.length <= MAX_CHUNK_CHARS) return [para];

  const sentences = splitBySentences(para);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 > MAX_CHUNK_CHARS && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [para.slice(0, MAX_CHUNK_CHARS)];
}

/**
 * Splits a document into semantic chunks suitable for embedding.
 * Handles markdown-style headings (# Heading) as section delimiters.
 */
export function chunkDocument(content: string, title: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  const lines = content.split("\n");

  let currentSection = title;
  let currentSectionPath = title;
  let buffer = "";
  let chunkIndex = 0;

  function flushBuffer() {
    const text = buffer.trim();
    if (text.length < MIN_CHUNK_CHARS) return;

    for (const part of splitLongParagraph(text)) {
      if (part.trim().length < MIN_CHUNK_CHARS) continue;
      chunkIndex++;
      chunks.push({
        kind: "PARAGRAPH",
        label: `${currentSection} — extrait ${chunkIndex}`,
        excerpt: part.trim(),
        sectionPath: currentSectionPath,
      });
    }
    buffer = "";
  }

  for (const line of lines) {
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
    if (headingMatch) {
      flushBuffer();
      currentSection = headingMatch[2]!.trim();
      currentSectionPath = `${title} > ${currentSection}`;
      // Add the heading itself as a short context chunk if not too short
      if (currentSection.length >= MIN_CHUNK_CHARS) {
        chunkIndex++;
        chunks.push({
          kind: "SECTION_INTRO",
          label: currentSection,
          excerpt: currentSection,
          sectionPath: currentSectionPath,
        });
      }
    } else if (line.trim() === "") {
      flushBuffer();
    } else {
      buffer = buffer ? `${buffer}\n${line}` : line;
    }
  }
  flushBuffer();

  // If nothing was produced (very short doc), emit a single chunk
  if (chunks.length === 0 && content.trim().length > 0) {
    chunks.push({
      kind: "PARAGRAPH",
      label: `${title} — extrait 1`,
      excerpt: content.trim().slice(0, MAX_CHUNK_CHARS),
      sectionPath: title,
    });
  }

  return chunks;
}
