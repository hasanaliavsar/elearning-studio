# eLearning Studio

Professional browser-based e-learning course authoring tool with SCORM export. Build interactive courses with rich content, quizzes, and export them as SCORM-compliant packages for any LMS.

## Features

### Course Authoring
- **Module > Lesson > Slide** hierarchy for organized course structure
- **Rich text editor** with full formatting (headings, bold, italic, lists, code blocks, images, links)
- **Multiple slide layouts**: Title, Content, Two-Column, Image+Text, Video, Quiz, Blank
- **Media embedding**: Images (upload or URL), YouTube/Vimeo videos
- **Drag-and-drop** content block reordering
- **Speaker notes** for instructor guidance

### Quiz Builder
- **Multiple Choice** with any number of options
- **True/False** questions
- **Fill in the Blank** with case-insensitive matching
- **Matching** pairs (term ↔ definition)
- Per-question **point values and explanations**
- Configurable **passing score and retry attempts**

### Course Preview
- Full-screen **learner simulation** with slide navigation
- **Interactive quiz taking** with immediate feedback
- **Progress bar** and slide counter
- **Score calculation** and pass/fail results screen

### SCORM Export
- **SCORM 1.2** (widest LMS compatibility)
- **SCORM 2004 4th Edition** (advanced features)
- Complete package with manifest, API wrapper, player, and styles
- **Bookmarking** (resume where you left off)
- **Score reporting** to LMS
- **Completion tracking** (view all slides, pass quiz, or both)

### Other Features
- **Auto-save** to browser localStorage
- **JSON import/export** for course backup
- **Course duplication** for creating variants
- **Customizable branding** (colors, fonts, logo)
- **Responsive** professional UI

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory. Deploy to any static hosting (Vercel, Netlify, GitHub Pages, etc.).

## Deploy to GitHub Pages

```bash
npm run build
# Push dist/ to gh-pages branch
```

## Tech Stack

- **React 18** + TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **TipTap** for rich text editing
- **Zustand** for state management
- **JSZip** + FileSaver for SCORM packaging
- **Lucide React** for icons

## SCORM Compatibility

Exported packages are compatible with:
- Moodle
- Canvas
- Blackboard
- Cornerstone
- SAP SuccessFactors
- TalentLMS
- SCORM Cloud
- Any SCORM 1.2 or 2004 compliant LMS

## License

MIT
