import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { generateId } from '../utils/helpers';
import {
  Sparkles,
  Wand2,
  Brain,
  Loader2,
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Check,
} from 'lucide-react';
import type {
  Course,
  Module,
  Lesson,
  Slide,
  ContentBlock,
  Question,
  QuizOption,
  QuestionType,
  SlideLayout,
} from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AI_KEY_STORAGE = 'elearning-ai-api-key';

function getStoredApiKey(): string {
  try {
    return localStorage.getItem(AI_KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

function storeApiKey(key: string) {
  try {
    localStorage.setItem(AI_KEY_STORAGE, key);
  } catch {
    // silent
  }
}

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent ?? div.innerText ?? '';
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

// ---------------------------------------------------------------------------
// Smart parsing: text -> course structure
// ---------------------------------------------------------------------------

interface ParsedSection {
  title: string;
  subsections: ParsedSubsection[];
}

interface ParsedSubsection {
  title: string;
  paragraphs: string[];
  bullets: string[];
  tableHeaders: string[];
  tableRows: string[][];
  keyTerms: string[]; // bold text extracted
}

function parseTextIntoCourse(rawText: string): ParsedSection[] {
  const lines = rawText.split('\n');
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;
  let currentSub: ParsedSubsection | null = null;

  function ensureSection(title: string) {
    currentSub = null;
    currentSection = {
      title,
      subsections: [],
    };
    sections.push(currentSection);
  }

  function ensureSubsection(title: string) {
    if (!currentSection) {
      ensureSection('Introduction');
    }
    currentSub = {
      title,
      paragraphs: [],
      bullets: [],
      tableHeaders: [],
      tableRows: [],
      keyTerms: [],
    };
    currentSection!.subsections.push(currentSub);
  }

  function extractBold(text: string): string[] {
    const matches: string[] = [];
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match: RegExpExecArray | null;
    while ((match = boldRegex.exec(text)) !== null) {
      matches.push(match[1]!);
    }
    const htmlBold = /<(?:b|strong)>(.+?)<\/(?:b|strong)>/gi;
    while ((match = htmlBold.exec(text)) !== null) {
      matches.push(match[1]!);
    }
    return matches;
  }

  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (!trimmed) {
      inTable = false;
      continue;
    }

    // Major heading: # or ##
    const majorMatch = trimmed.match(/^#{1,2}\s+(.+)/);
    if (majorMatch) {
      ensureSection(majorMatch[1]!.trim());
      continue;
    }

    // ALL CAPS line (at least 3 chars, no lowercase)
    if (/^[A-Z][A-Z0-9 :&,/-]{2,}$/.test(trimmed)) {
      ensureSection(trimmed.charAt(0) + trimmed.slice(1).toLowerCase());
      continue;
    }

    // Short line followed by blank = section heading heuristic
    if (
      trimmed.length < 60 &&
      !trimmed.startsWith('-') &&
      !trimmed.startsWith('*') &&
      i + 1 < lines.length &&
      lines[i + 1]!.trim() === ''
    ) {
      // Could be a section if no current section, or a subsection
      if (!currentSection) {
        ensureSection(trimmed);
      } else if (trimmed.length < 40) {
        ensureSubsection(trimmed);
      } else {
        if (!currentSub) ensureSubsection('Overview');
        currentSub!.paragraphs.push(trimmed);
      }
      continue;
    }

    // Sub heading: ### or #### or numbered "1." "2." at line start
    const subMatch = trimmed.match(/^#{3,}\s+(.+)/);
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (subMatch) {
      ensureSubsection(subMatch[1]!.trim());
      continue;
    }
    if (numberedMatch && trimmed.length < 80 && !trimmed.includes('.', trimmed.indexOf('.') + 1)) {
      ensureSubsection(numberedMatch[1]!.trim());
      continue;
    }

    // Table detection: lines with | or tab-separated data
    if (trimmed.includes('|') && trimmed.split('|').length >= 3) {
      if (!currentSub) ensureSubsection('Data');
      const cells = trimmed.split('|').map((c) => c.trim()).filter(Boolean);
      // Skip separator lines like |---|---|
      if (/^[-| :]+$/.test(trimmed)) continue;
      if (!inTable) {
        currentSub!.tableHeaders = cells;
        inTable = true;
      } else {
        currentSub!.tableRows.push(cells);
      }
      continue;
    }

    // Bullet point
    if (/^[-*+]\s+/.test(trimmed)) {
      if (!currentSub) ensureSubsection('Key Points');
      const bulletText = trimmed.replace(/^[-*+]\s+/, '');
      currentSub!.bullets.push(bulletText);
      const boldTerms = extractBold(bulletText);
      currentSub!.keyTerms.push(...boldTerms);
      continue;
    }

    // Regular paragraph
    if (!currentSub) ensureSubsection('Overview');
    currentSub!.paragraphs.push(trimmed);
    const boldTerms = extractBold(trimmed);
    currentSub!.keyTerms.push(...boldTerms);
  }

  // If no sections were created, create one from the text
  if (sections.length === 0) {
    ensureSection('Course Content');
    ensureSubsection('Overview');
    currentSub!.paragraphs.push(rawText.substring(0, 2000));
  }

  // Ensure every section has at least one subsection
  for (const section of sections) {
    if (section.subsections.length === 0) {
      section.subsections.push({
        title: 'Overview',
        paragraphs: [],
        bullets: [],
        tableHeaders: [],
        tableRows: [],
        keyTerms: [],
      });
    }
  }

  return sections;
}

function buildContentBlocks(sub: ParsedSubsection): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  // Heading
  blocks.push({
    id: generateId(),
    type: 'heading',
    content: `<h2>${sub.title}</h2>`,
    alt: '',
    caption: '',
  });

  // Paragraphs
  for (const para of sub.paragraphs) {
    blocks.push({
      id: generateId(),
      type: 'text',
      content: `<p>${para}</p>`,
      alt: '',
      caption: '',
    });
  }

  // Bullet list
  if (sub.bullets.length > 0) {
    const listHtml = '<ul>' + sub.bullets.map((b) => `<li>${b}</li>`).join('') + '</ul>';
    blocks.push({
      id: generateId(),
      type: 'list',
      content: listHtml,
      alt: '',
      caption: '',
    });
  }

  // Table
  if (sub.tableHeaders.length > 0) {
    blocks.push({
      id: generateId(),
      type: 'table',
      content: '',
      alt: '',
      caption: '',
      data: {
        tableHeaders: sub.tableHeaders,
        tableRows: sub.tableRows,
        tableStriped: true,
      },
    });
  }

  return blocks;
}

function buildSlideFromSubsection(sub: ParsedSubsection): Slide {
  return {
    id: generateId(),
    title: sub.title,
    layout: 'content' as SlideLayout,
    content: buildContentBlocks(sub),
    questions: [],
    notes: '',
    backgroundColor: '#ffffff',
    backgroundImage: '',
    duration: 2,
  };
}

function buildCoverSlide(title: string, subtitle: string): Slide {
  return {
    id: generateId(),
    title,
    layout: 'title' as SlideLayout,
    content: [
      {
        id: generateId(),
        type: 'heading',
        content: `<h1>${title}</h1>`,
        alt: '',
        caption: '',
      },
      {
        id: generateId(),
        type: 'text',
        content: `<p>${subtitle}</p>`,
        alt: '',
        caption: '',
      },
    ],
    questions: [],
    notes: '',
    backgroundColor: '#ffffff',
    backgroundImage: '',
    duration: 2,
    isCoverSlide: true,
    coverSubtitle: subtitle,
  };
}

function buildQuizSlideFromTerms(terms: string[], sectionTitle: string): Slide {
  const questions: Question[] = [];

  for (const term of terms.slice(0, 5)) {
    const q: Question = {
      id: generateId(),
      type: 'fill-in-blank',
      text: `Fill in the blank: The key concept related to "${sectionTitle}" is _____.`,
      options: [],
      matchingPairs: [],
      correctAnswer: term,
      correctOrder: [],
      explanation: `The correct answer is "${term}".`,
      points: 10,
    };
    questions.push(q);
  }

  if (questions.length === 0) {
    // Generate a simple true/false
    questions.push({
      id: generateId(),
      type: 'true-false',
      text: `This module covered the topic: "${sectionTitle}".`,
      options: [
        { id: generateId(), text: 'True', isCorrect: true },
        { id: generateId(), text: 'False', isCorrect: false },
      ],
      matchingPairs: [],
      correctAnswer: 'True',
      correctOrder: [],
      explanation: `Yes, this module covered "${sectionTitle}".`,
      points: 10,
    });
  }

  return {
    id: generateId(),
    title: `${sectionTitle} - Assessment`,
    layout: 'quiz' as SlideLayout,
    content: [
      {
        id: generateId(),
        type: 'heading',
        content: `<h2>${sectionTitle} - Knowledge Check</h2>`,
        alt: '',
        caption: '',
      },
    ],
    questions,
    notes: '',
    backgroundColor: '#ffffff',
    backgroundImage: '',
    duration: 5,
  };
}

interface GeneratedCourseStructure {
  title: string;
  description: string;
  modules: {
    title: string;
    description: string;
    lessons: {
      title: string;
      slides: Slide[];
    }[];
  }[];
}

function generateCourseFromText(text: string, courseTitle?: string): GeneratedCourseStructure {
  const sections = parseTextIntoCourse(text);

  const title = courseTitle || sections[0]?.title || 'Generated Course';
  const allTerms: string[] = [];

  const modules = sections.map((section, idx) => {
    const sectionTerms = section.subsections.flatMap((s) => s.keyTerms);
    allTerms.push(...sectionTerms);

    const slides: Slide[] = [];

    // Cover slide
    slides.push(
      buildCoverSlide(section.title, `Module ${idx + 1}`)
    );

    // Content slides
    for (const sub of section.subsections) {
      slides.push(buildSlideFromSubsection(sub));
    }

    // Assessment slide if there are key terms
    if (sectionTerms.length > 0) {
      slides.push(buildQuizSlideFromTerms(sectionTerms, section.title));
    }

    return {
      title: section.title,
      description: `Module covering ${section.title.toLowerCase()}`,
      lessons: [
        {
          title: section.title,
          slides,
        },
      ],
    };
  });

  // Add a final comprehensive assessment module if there are enough terms
  if (allTerms.length > 3) {
    const finalQuizSlide = buildQuizSlideFromTerms(allTerms.slice(0, 10), 'Final Assessment');
    modules.push({
      title: 'Final Assessment',
      description: 'Comprehensive assessment covering all modules',
      lessons: [
        {
          title: 'Final Assessment',
          slides: [
            buildCoverSlide('Final Assessment', 'Test your knowledge'),
            finalQuizSlide,
          ],
        },
      ],
    });
  }

  return {
    title,
    description: `AI-generated course based on provided content with ${modules.length} modules`,
    modules,
  };
}

// ---------------------------------------------------------------------------
// Claude API generation
// ---------------------------------------------------------------------------

async function generateCourseWithClaude(
  text: string,
  apiKey: string,
  courseTitle?: string
): Promise<GeneratedCourseStructure> {
  const prompt = `You are an expert instructional designer. Given the following content, create a structured e-learning course.

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "title": "Course Title",
  "description": "Brief course description",
  "modules": [
    {
      "title": "Module Title",
      "description": "Module description",
      "lessons": [
        {
          "title": "Lesson Title",
          "slides": [
            {
              "title": "Slide Title",
              "type": "content",
              "contentBlocks": [
                { "type": "heading", "content": "<h2>Heading</h2>" },
                { "type": "text", "content": "<p>Paragraph text</p>" },
                { "type": "list", "content": "<ul><li>Point 1</li><li>Point 2</li></ul>" }
              ],
              "questions": []
            },
            {
              "title": "Quiz Slide",
              "type": "quiz",
              "contentBlocks": [{ "type": "heading", "content": "<h2>Knowledge Check</h2>" }],
              "questions": [
                {
                  "type": "multiple-choice",
                  "text": "Question text?",
                  "options": [
                    { "text": "Option A", "isCorrect": true },
                    { "text": "Option B", "isCorrect": false },
                    { "text": "Option C", "isCorrect": false },
                    { "text": "Option D", "isCorrect": false }
                  ],
                  "explanation": "Explanation text"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

Rules:
- Create a cover slide (type "title") for each module with an <h1> heading
- Each module should have 2-5 slides
- Include quiz slides with multiple-choice, true-false, or fill-in-blank questions
- For fill-in-blank, include a "correctAnswer" field instead of options
- For true-false, use options with "True" and "False"
- Use proper HTML in content blocks
- Make content educational and well-structured
${courseTitle ? `- Use "${courseTitle}" as the course title` : ''}

Content to convert into a course:
${text.substring(0, 6000)}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text ?? '';

  // Parse the JSON from Claude's response
  let parsed: {
    title: string;
    description: string;
    modules: {
      title: string;
      description: string;
      lessons: {
        title: string;
        slides: {
          title: string;
          type: string;
          contentBlocks: { type: string; content: string }[];
          questions: {
            type: string;
            text: string;
            options?: { text: string; isCorrect: boolean }[];
            correctAnswer?: string;
            explanation: string;
          }[];
        }[];
      }[];
    }[];
  };

  try {
    // Try to extract JSON from the response — handle possible markdown fences
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Failed to parse AI response. Please try again.');
  }

  // Convert to our GeneratedCourseStructure
  return {
    title: parsed.title || courseTitle || 'AI Generated Course',
    description: parsed.description || '',
    modules: parsed.modules.map((mod) => ({
      title: mod.title,
      description: mod.description || '',
      lessons: mod.lessons.map((les) => ({
        title: les.title,
        slides: les.slides.map((sl) => {
          const layout: SlideLayout = sl.type === 'quiz' ? 'quiz' : sl.type === 'title' ? 'title' : 'content';

          const blocks: ContentBlock[] = (sl.contentBlocks || []).map((cb) => ({
            id: generateId(),
            type: cb.type as ContentBlock['type'],
            content: cb.content,
            alt: '',
            caption: '',
          }));

          const questions: Question[] = (sl.questions || []).map((q) => ({
            id: generateId(),
            type: q.type as QuestionType,
            text: q.text,
            options: (q.options || []).map((o) => ({
              id: generateId(),
              text: o.text,
              isCorrect: o.isCorrect,
            })),
            matchingPairs: [],
            correctAnswer: q.correctAnswer || '',
            correctOrder: [],
            explanation: q.explanation || '',
            points: 10,
          }));

          return {
            id: generateId(),
            title: sl.title,
            layout,
            content: blocks,
            questions,
            notes: '',
            backgroundColor: '#ffffff',
            backgroundImage: '',
            duration: layout === 'quiz' ? 5 : 2,
          } as Slide;
        }),
      })),
    })),
  };
}

// ---------------------------------------------------------------------------
// Smart quiz generation (no API)
// ---------------------------------------------------------------------------

function generateQuestionsFromText(
  text: string,
  count: number,
  types: QuestionType[]
): Question[] {
  const plainText = stripHtml(text);
  const sentences = splitSentences(plainText);
  const questions: Question[] = [];

  if (sentences.length === 0) return questions;

  // Extract bold/important terms
  const boldTerms: string[] = [];
  const boldRegex = /\*\*(.+?)\*\*/g;
  let boldMatch: RegExpExecArray | null;
  while ((boldMatch = boldRegex.exec(text)) !== null) {
    boldTerms.push(boldMatch[1]!);
  }
  const htmlBoldRegex = /<(?:b|strong)>(.+?)<\/(?:b|strong)>/gi;
  while ((boldMatch = htmlBoldRegex.exec(text)) !== null) {
    boldTerms.push(boldMatch[1]!);
  }

  // Also extract words that seem like key terms (capitalized words in middle of sentences)
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/);
    for (let i = 1; i < words.length; i++) {
      const w = words[i]!.replace(/[^a-zA-Z]/g, '');
      if (w.length > 3 && /^[A-Z][a-z]+/.test(w) && !['The', 'This', 'That', 'They', 'These', 'Those', 'When', 'Where', 'Which', 'What', 'With', 'From', 'Into', 'After', 'Before', 'While', 'During', 'About', 'Also', 'However', 'Therefore', 'Because', 'Since', 'Although'].includes(w)) {
        boldTerms.push(w);
      }
    }
  }

  const uniqueTerms = [...new Set(boldTerms)];

  let typeIndex = 0;

  for (let i = 0; i < count && i < sentences.length; i++) {
    const currentType = types[typeIndex % types.length]!;
    typeIndex++;
    const sentence = sentences[i % sentences.length]!;

    if (currentType === 'fill-in-blank') {
      // Find a key term in the sentence, or use a significant word
      let blankTerm = uniqueTerms.find((t) => sentence.includes(t));
      if (!blankTerm) {
        // Pick a significant word (> 4 chars, not a common word)
        const words = sentence.split(/\s+/).filter((w) => w.replace(/[^a-zA-Z]/g, '').length > 4);
        blankTerm = words[Math.floor(words.length / 2)] || words[0] || 'answer';
        blankTerm = blankTerm.replace(/[^a-zA-Z0-9]/g, '');
      }
      const blankedText = sentence.replace(blankTerm, '_____');

      questions.push({
        id: generateId(),
        type: 'fill-in-blank',
        text: `Fill in the blank: ${blankedText}`,
        options: [],
        matchingPairs: [],
        correctAnswer: blankTerm,
        correctOrder: [],
        explanation: `The correct answer is "${blankTerm}". Original: ${sentence}`,
        points: 10,
      });
    } else if (currentType === 'true-false') {
      // Use the sentence as a true statement
      const isTrue = Math.random() > 0.4; // bias toward true
      let displayText = sentence;

      if (!isTrue) {
        // Create a false version by negating or modifying
        if (sentence.includes(' is ')) {
          displayText = sentence.replace(' is ', ' is not ');
        } else if (sentence.includes(' are ')) {
          displayText = sentence.replace(' are ', ' are not ');
        } else if (sentence.includes(' can ')) {
          displayText = sentence.replace(' can ', ' cannot ');
        } else if (sentence.includes(' will ')) {
          displayText = sentence.replace(' will ', ' will not ');
        } else if (sentence.includes(' has ')) {
          displayText = sentence.replace(' has ', ' does not have ');
        } else {
          // Prepend "It is false that"
          displayText = `It is false that ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
        }
      }

      questions.push({
        id: generateId(),
        type: 'true-false',
        text: displayText,
        options: [
          { id: generateId(), text: 'True', isCorrect: isTrue },
          { id: generateId(), text: 'False', isCorrect: !isTrue },
        ],
        matchingPairs: [],
        correctAnswer: isTrue ? 'True' : 'False',
        correctOrder: [],
        explanation: isTrue
          ? `This statement is true. ${sentence}`
          : `This statement is false. The original fact is: ${sentence}`,
        points: 10,
      });
    } else {
      // multiple-choice
      const words = sentence.split(/\s+/).filter((w) => w.replace(/[^a-zA-Z]/g, '').length > 3);
      const keyWord =
        uniqueTerms.find((t) => sentence.includes(t)) ||
        words[Math.floor(words.length / 2)] ||
        'the answer';
      const cleanKey = keyWord.replace(/[^a-zA-Z0-9 ]/g, '');

      // Generate distractors by modifying the key word
      const distractors = generateDistractors(cleanKey, uniqueTerms);

      const options: QuizOption[] = [
        { id: generateId(), text: cleanKey, isCorrect: true },
        ...distractors.map((d) => ({
          id: generateId(),
          text: d,
          isCorrect: false,
        })),
      ];

      // Shuffle options
      for (let j = options.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        const tmp = options[j]!; options[j] = options[k]!; options[k] = tmp;
      }

      questions.push({
        id: generateId(),
        type: 'multiple-choice',
        text: `Based on the content, which of the following is correct regarding: "${sentence.substring(0, 80)}..."?`,
        options,
        matchingPairs: [],
        correctAnswer: cleanKey,
        correctOrder: [],
        explanation: `The correct answer is "${cleanKey}". ${sentence}`,
        points: 10,
      });
    }
  }

  return questions;
}

function generateDistractors(correctAnswer: string, terms: string[]): string[] {
  const distractors: string[] = [];
  // Use other terms as distractors if available
  const otherTerms = terms.filter(
    (t) => t.toLowerCase() !== correctAnswer.toLowerCase()
  );

  for (const t of otherTerms.slice(0, 3)) {
    distractors.push(t);
  }

  // Fill remaining with generic distractors
  const genericSuffixes = [' process', ' system', ' method', ' concept'];
  while (distractors.length < 3) {
    const suffix = genericSuffixes[distractors.length % genericSuffixes.length];
    const base =
      correctAnswer.length > 5
        ? correctAnswer.substring(0, 3) +
          String.fromCharCode(97 + distractors.length) +
          correctAnswer.substring(4)
        : `Option ${String.fromCharCode(65 + distractors.length + 1)}${suffix}`;
    distractors.push(base);
  }

  return distractors.slice(0, 3);
}

async function generateQuizWithClaude(
  text: string,
  count: number,
  types: QuestionType[],
  apiKey: string
): Promise<Question[]> {
  const typeStr = types.join(', ');
  const prompt = `You are an expert assessment designer. Given the following content, generate ${count} quiz questions.

Return ONLY valid JSON (no markdown, no code fences) as an array of question objects:
[
  {
    "type": "multiple-choice",
    "text": "Question text?",
    "options": [
      { "text": "Option A", "isCorrect": true },
      { "text": "Option B", "isCorrect": false },
      { "text": "Option C", "isCorrect": false },
      { "text": "Option D", "isCorrect": false }
    ],
    "explanation": "Why this is correct"
  }
]

Question types to include: ${typeStr}
For "fill-in-blank": use "correctAnswer" field (string), no options.
For "true-false": use options with "True" and "False".
For "multiple-choice": 4 options, exactly one correct.

Generate exactly ${count} questions mixing the specified types.
Make questions challenging but fair, based directly on the content.

Content:
${text.substring(0, 4000)}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text ?? '';

  let parsed: {
    type: string;
    text: string;
    options?: { text: string; isCorrect: boolean }[];
    correctAnswer?: string;
    explanation: string;
  }[];

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found');
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Failed to parse AI response. Please try again.');
  }

  return parsed.map((q) => ({
    id: generateId(),
    type: q.type as QuestionType,
    text: q.text,
    options: (q.options || []).map((o) => ({
      id: generateId(),
      text: o.text,
      isCorrect: o.isCorrect,
    })),
    matchingPairs: [],
    correctAnswer: q.correctAnswer || '',
    correctOrder: [],
    explanation: q.explanation || '',
    points: 10,
  }));
}

// ---------------------------------------------------------------------------
// Component: AI Course Generator Modal
// ---------------------------------------------------------------------------

interface AIGenerateCourseModalProps {
  open: boolean;
  onClose: () => void;
}

export function AIGenerateCourseModal({ open, onClose }: AIGenerateCourseModalProps) {
  const importCourse = useStore((s) => s.importCourse);
  const openCourseEditor = useStore((s) => s.openCourseEditor);

  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [textContent, setTextContent] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [apiKey, setApiKey] = useState(getStoredApiKey);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState<GeneratedCourseStructure | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());

  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleGenerate = useCallback(async () => {
    const content = textContent.trim() || topicInput.trim();
    if (!content) {
      setError('Please paste content or describe a topic.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let result: GeneratedCourseStructure;

      if (apiKey.trim()) {
        storeApiKey(apiKey.trim());

        // If only a topic is provided, create a prompt for it
        const inputText =
          textContent.trim() ||
          `Create a comprehensive course about: ${topicInput.trim()}. Include key concepts, examples, and best practices.`;

        result = await generateCourseWithClaude(inputText, apiKey.trim(), topicInput.trim() || undefined);
      } else {
        // Smart parsing
        const inputText =
          textContent.trim() ||
          `# ${topicInput.trim()}\n\n## Overview\n\nThis course covers ${topicInput.trim()}.\n\n## Key Concepts\n\n- Concept 1: Understanding the basics\n- Concept 2: Core principles\n- Concept 3: Best practices\n\n## Application\n\nPractical application of ${topicInput.trim()} in real-world scenarios.\n\n## Summary\n\nKey takeaways and next steps for ${topicInput.trim()}.`;

        result = generateCourseFromText(inputText, topicInput.trim() || undefined);
      }

      setGenerated(result);
      setExpandedModules(new Set(result.modules.map((_, i) => i)));
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [textContent, topicInput, apiKey]);

  const toggleModule = (idx: number) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const updateModuleTitle = (idx: number, title: string) => {
    if (!generated) return;
    const updated = { ...generated };
    updated.modules = [...updated.modules];
    updated.modules[idx] = { ...updated.modules[idx]!, title };
    setGenerated(updated);
  };

  const updateSlideTitle = (modIdx: number, lesIdx: number, slideIdx: number, title: string) => {
    if (!generated) return;
    const updated = { ...generated };
    updated.modules = updated.modules.map((m, mi) => {
      if (mi !== modIdx) return m;
      return {
        ...m,
        lessons: m.lessons.map((l, li) => {
          if (li !== lesIdx) return l;
          return {
            ...l,
            slides: l.slides.map((s, si) => {
              if (si !== slideIdx) return s;
              return { ...s, title };
            }),
          };
        }),
      };
    });
    setGenerated(updated);
  };

  const removeModule = (idx: number) => {
    if (!generated || generated.modules.length <= 1) return;
    const updated = { ...generated };
    updated.modules = updated.modules.filter((_, i) => i !== idx);
    setGenerated(updated);
  };

  const removeSlide = (modIdx: number, lesIdx: number, slideIdx: number) => {
    if (!generated) return;
    const updated = { ...generated };
    updated.modules = updated.modules.map((m, mi) => {
      if (mi !== modIdx) return m;
      return {
        ...m,
        lessons: m.lessons.map((l, li) => {
          if (li !== lesIdx) return l;
          const newSlides = l.slides.filter((_, si) => si !== slideIdx);
          if (newSlides.length === 0) return l; // don't remove last slide
          return { ...l, slides: newSlides };
        }),
      };
    });
    setGenerated(updated);
  };

  const moveModuleUp = (idx: number) => {
    if (!generated || idx === 0) return;
    const updated = { ...generated };
    updated.modules = [...updated.modules];
    const tmp = updated.modules[idx - 1]!;
    updated.modules[idx - 1] = updated.modules[idx]!;
    updated.modules[idx] = tmp;
    setGenerated(updated);
  };

  const moveModuleDown = (idx: number) => {
    if (!generated || idx >= generated.modules.length - 1) return;
    const updated = { ...generated };
    updated.modules = [...updated.modules];
    const tmp2 = updated.modules[idx]!;
    updated.modules[idx] = updated.modules[idx + 1]!;
    updated.modules[idx + 1] = tmp2;
    setGenerated(updated);
  };

  const handleCreateCourse = useCallback(() => {
    if (!generated) return;

    const now = new Date().toISOString();
    const course: Course = {
      id: generateId(),
      title: generated.title,
      description: generated.description,
      author: '',
      version: '1.0',
      language: 'en',
      thumbnail: '',
      modules: generated.modules.map((mod, modIdx) => ({
        id: generateId(),
        title: mod.title,
        description: mod.description,
        order: modIdx,
        thumbnail: '',
        color: '',
        lessons: mod.lessons.map((les, lesIdx) => ({
          id: generateId(),
          title: les.title,
          description: '',
          order: lesIdx,
          slides: les.slides,
        })),
      })),
      settings: {
        passingScore: 70,
        showFeedback: true,
        allowRetry: true,
        maxAttempts: 3,
        shuffleQuestions: false,
        showProgress: true,
        completionCriteria: 'all-slides',
        primaryColor: '#4f46e5',
        accentColor: '#10b981',
        fontFamily: 'Inter',
        logoUrl: '',
        theme: 'modern',
        defaultTransition: 'fade',
        defaultAnimation: 'fade-in',
        showCertificate: true,
        certificateTitle: 'Certificate of Completion',
        certificateOrg: '',
        enableScrollReveal: true,
        enableKeyboardNav: true,
        enableGamification: true,
        landingPage: {
          enabled: true,
          backgroundColor: '#fdf0e8',
          backgroundGradient: '',
          textColor: '#1e293b',
          showModuleList: true,
          showProgress: true,
          showCompanyLogo: true,
          companyLogoUrl: '',
          companyName: '',
          tagline: '',
          heroImageUrl: '',
        },
      },
      createdAt: now,
      updatedAt: now,
      tags: ['ai-generated'],
    };

    importCourse(course);

    // Open the newly created course in editor
    // importCourse assigns a new ID, so we need to get it from the store
    const state = useStore.getState();
    const imported = state.courses[state.courses.length - 1];
    if (imported) {
      openCourseEditor(imported.id);
    }

    // Reset and close
    setStep('input');
    setTextContent('');
    setTopicInput('');
    setGenerated(null);
    setError('');
    onClose();
  }, [generated, importCourse, openCourseEditor, onClose]);

  const handleBack = () => {
    setStep('input');
  };

  const handleClose = () => {
    setStep('input');
    setError('');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-50 rounded-md">
              <Brain className="w-5 h-5 text-brand-700" />
            </div>
            <div>
              <h2 className="font-display text-2xl text-brand-800" style={{ fontWeight: 400 }}>AI Course Generator</h2>
              <p className="text-sm text-gray-500">
                {step === 'input' ? 'Provide content to generate a course' : 'Review and customize'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'input' && (
            <div className="space-y-5">
              {/* Textarea for pasting content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Paste your document, notes, or topic description
                </label>
                <textarea
                  className="input w-full h-48 resize-y font-mono text-sm"
                  placeholder="Paste your course content here... Supports markdown, bullet points, headings, tables, and plain text."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                />
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400 uppercase tracking-wide">or</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              {/* Topic input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Describe a topic
                </label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder='e.g., "Fire safety training for office workers"'
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                />
              </div>

              {/* API Key */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Claude API Key
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <input
                  type="password"
                  className="input w-full"
                  placeholder="sk-ant-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  For enhanced AI generation. Leave empty for smart parsing.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}
            </div>
          )}

          {step === 'preview' && generated && (
            <div className="space-y-4">
              {/* Course title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
                <input
                  type="text"
                  className="input w-full text-lg font-semibold"
                  value={generated.title}
                  onChange={(e) => setGenerated({ ...generated, title: e.target.value })}
                />
              </div>

              <p className="text-sm text-gray-500">{generated.description}</p>

              {/* Module list */}
              <div className="space-y-3">
                {generated.modules.map((mod, modIdx) => (
                  <div key={modIdx} className="card border border-gray-200">
                    {/* Module header */}
                    <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={() => toggleModule(modIdx)}>
                      {expandedModules.has(modIdx) ? (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <input
                        type="text"
                        className="flex-1 font-medium text-sm bg-transparent border-none outline-none focus:ring-0 p-0"
                        value={mod.title}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateModuleTitle(modIdx, e.target.value)}
                      />
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {mod.lessons.reduce((t, l) => t + l.slides.length, 0)} slides
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); moveModuleUp(modIdx); }}
                          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          disabled={modIdx === 0}
                          title="Move up"
                        >
                          <ChevronRight className="w-3 h-3 -rotate-90" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveModuleDown(modIdx); }}
                          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          disabled={modIdx === generated.modules.length - 1}
                          title="Move down"
                        >
                          <ChevronRight className="w-3 h-3 rotate-90" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeModule(modIdx); }}
                          className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                          title="Remove module"
                          disabled={generated.modules.length <= 1}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded content */}
                    {expandedModules.has(modIdx) && (
                      <div className="border-t border-gray-100 px-3 pb-3">
                        {mod.lessons.map((les, lesIdx) => (
                          <div key={lesIdx} className="mt-2">
                            {mod.lessons.length > 1 && (
                              <p className="text-xs font-medium text-gray-500 mb-1">
                                {les.title}
                              </p>
                            )}
                            <div className="space-y-1">
                              {les.slides.map((slide, slideIdx) => (
                                <div
                                  key={slide.id}
                                  className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 group"
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                      slide.layout === 'quiz'
                                        ? 'bg-amber-400'
                                        : slide.layout === 'title'
                                          ? 'bg-indigo-400'
                                          : 'bg-gray-300'
                                    }`}
                                  />
                                  <input
                                    type="text"
                                    className="flex-1 text-sm bg-transparent border-none outline-none focus:ring-0 p-0 text-gray-700"
                                    value={slide.title}
                                    onChange={(e) =>
                                      updateSlideTitle(modIdx, lesIdx, slideIdx, e.target.value)
                                    }
                                  />
                                  <span className="text-xs text-gray-400 flex-shrink-0">
                                    {slide.layout === 'quiz'
                                      ? `${slide.questions.length}q`
                                      : slide.layout}
                                  </span>
                                  <button
                                    onClick={() => removeSlide(modIdx, lesIdx, slideIdx)}
                                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-opacity"
                                    title="Remove slide"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          {step === 'preview' && (
            <button onClick={handleBack} className="btn-secondary text-sm">
              Back
            </button>
          )}
          {step === 'input' && <div />}
          <div className="flex items-center gap-3">
            <button onClick={handleClose} className="btn-secondary text-sm">
              Cancel
            </button>
            {step === 'input' && (
              <button
                onClick={handleGenerate}
                disabled={loading || (!textContent.trim() && !topicInput.trim())}
                className="btn-primary text-sm flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate Course
                  </>
                )}
              </button>
            )}
            {step === 'preview' && (
              <button onClick={handleCreateCourse} className="btn-primary text-sm flex items-center gap-2">
                <Check className="w-4 h-4" />
                Create Course
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component: AI Quiz Generator Button
// ---------------------------------------------------------------------------

interface AIQuizGeneratorButtonProps {
  courseId: string;
  moduleId: string;
  lessonId: string;
  slideId: string;
  slideContent: string;
}

export function AIQuizGeneratorButton({
  courseId,
  moduleId,
  lessonId,
  slideId,
  slideContent,
}: AIQuizGeneratorButtonProps) {
  const updateSlide = useStore((s) => s.updateSlide);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questionCount, setQuestionCount] = useState(3);
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([
    'multiple-choice',
    'true-false',
    'fill-in-blank',
  ]);

  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const toggleType = (type: QuestionType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        if (prev.length <= 1) return prev; // keep at least one
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  };

  const handleGenerate = async () => {
    if (!slideContent.trim()) {
      setError('No slide content to generate questions from.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const apiKey = getStoredApiKey();
      let questions: Question[];

      if (apiKey) {
        questions = await generateQuizWithClaude(slideContent, questionCount, selectedTypes, apiKey);
      } else {
        questions = generateQuestionsFromText(slideContent, questionCount, selectedTypes);
      }

      if (questions.length === 0) {
        setError('Could not generate questions from this content. Try adding more text.');
        return;
      }

      // Get the current slide to append questions
      const state = useStore.getState();
      const course = state.courses.find((c) => c.id === courseId);
      const mod = course?.modules.find((m) => m.id === moduleId);
      const lesson = mod?.lessons.find((l) => l.id === lessonId);
      const slide = lesson?.slides.find((s) => s.id === slideId);

      if (slide) {
        const existingQuestions = slide.questions || [];
        updateSlide(courseId, moduleId, lessonId, slideId, {
          questions: [...existingQuestions, ...questions],
          layout: 'quiz',
        });
      }

      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-md transition-colors"
        title="AI Quiz Generator"
      >
        <Sparkles className="w-3.5 h-3.5" />
        AI Quiz
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50"
        >
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <h3 className="text-sm font-semibold text-gray-900">Generate Quiz Questions</h3>
            </div>

            {/* Source */}
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Generate from slide content
            </div>

            {/* Number of questions */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Number of questions
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setQuestionCount(n)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      questionCount === n
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Question types */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Question types
              </label>
              <div className="space-y-1.5">
                {(
                  [
                    { type: 'multiple-choice' as QuestionType, label: 'Multiple Choice' },
                    { type: 'true-false' as QuestionType, label: 'True / False' },
                    { type: 'fill-in-blank' as QuestionType, label: 'Fill in Blank' },
                  ] as const
                ).map(({ type, label }) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 cursor-pointer text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={() => toggleType(type)}
                      className="rounded border-ivory-200 text-brand-600 focus:ring-brand-600"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={loading || selectedTypes.length === 0}
              className="btn-primary w-full text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>

            {!getStoredApiKey() && (
              <p className="text-xs text-gray-400 text-center">
                Using smart parsing. Add an API key in settings for better results.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component: AI Settings Section
// ---------------------------------------------------------------------------

export function AISettingsSection() {
  const [apiKey, setApiKey] = useState(getStoredApiKey);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    storeApiKey(apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    setApiKey('');
    storeApiKey('');
    setSaved(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-brand-600" />
        <h3 className="text-sm font-semibold text-gray-900">AI Generation Settings</h3>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Claude API Key</label>
        <div className="flex items-center gap-2">
          <input
            type="password"
            className="input flex-1"
            placeholder="sk-ant-..."
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setSaved(false);
            }}
          />
          <button onClick={handleSave} className="btn-primary text-sm px-3 py-2">
            {saved ? (
              <Check className="w-4 h-4" />
            ) : (
              'Save'
            )}
          </button>
          {apiKey && (
            <button onClick={handleClear} className="btn-secondary text-sm px-3 py-2">
              Clear
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Provide a Claude API key for enhanced AI course and quiz generation. Without a key, the
          smart parser uses pattern matching to structure your content.
        </p>
      </div>

      {apiKey && (
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
          <Check className="w-3.5 h-3.5" />
          API key configured. AI generation will use Claude for better results.
        </div>
      )}
    </div>
  );
}
