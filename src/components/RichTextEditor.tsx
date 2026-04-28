import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
// Extend TextStyle with a fontSize attribute (TipTap's default doesn't include it)
const TextStyleWithFontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontSize?.replace(/['"]+/g, '') || null,
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
    };
  },
});
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { useEffect, useCallback, useRef, useState } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Code, Minus, Link as LinkIcon,
  Image as ImageIcon, Heading1, Heading2, Heading3,
  Undo, Redo, Highlighter, RemoveFormatting,
  Type, Palette, Smile, Subscript as SubscriptIcon, Superscript as SuperscriptIcon,
  ChevronDown,
} from 'lucide-react';

interface Props {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minimal?: boolean;
}

// ─── Fonts ───────────────────────────────────────────────────────────────
// Moonfare brand fonts first, then common system + Google fonts.
const FONT_FAMILIES: { label: string; value: string; preview?: string }[] = [
  { label: 'Inter (default)', value: 'Inter, system-ui, sans-serif' },
  { label: 'Fraunces (display)', value: '"Fraunces", Georgia, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", Helvetica, sans-serif' },
];

// ─── Sizes ───────────────────────────────────────────────────────────────
const FONT_SIZES = ['10', '12', '14', '16', '18', '20', '24', '28', '32', '40', '48', '60', '72'];

// ─── Colors ──────────────────────────────────────────────────────────────
// Moonfare brand palette + a few neutrals + standard colors.
const TEXT_COLORS = [
  '#0A0C3F', // navy ink (Moonfare)
  '#171D97', // navy (Moonfare)
  '#D4A574', // sand (Moonfare)
  '#5C5A57', // ink muted (Moonfare)
  '#1A1A1F',
  '#374151',
  '#9CA3AF',
  '#FFFFFF',
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#0EA5E9', // blue
  '#A855F7', // purple
  '#EC4899', // pink
];

const HIGHLIGHT_COLORS = [
  'transparent',
  '#FEF08A', // yellow
  '#FED7AA', // orange
  '#FECACA', // red
  '#BBF7D0', // green
  '#BAE6FD', // blue
  '#E9D5FF', // purple
  '#FBCFE8', // pink
  '#FAF8F4', // ivory (Moonfare paper)
];

// ─── Emojis ──────────────────────────────────────────────────────────────
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  { label: 'Smileys', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😋','😛','😜','🤪','😎','🤓','🧐','🤔','🫡','😐','😑','😶','🫥','🙄','😏','😒','🤨'] },
  { label: 'Reactions', emojis: ['👍','👎','👌','🙌','👏','🤝','👋','✌️','🤞','🤟','🤘','🤙','💪','🙏','✊','👊','💯','🔥','⚡️','💥','✨','🎉','🎊','🥳','🤯','😱','🚨'] },
  { label: 'Symbols', emojis: ['✅','❌','⚠️','❓','❗','💡','📌','📍','🔖','🏷️','💼','🎯','🚀','📈','📊','📉','📋','📝','✏️','🖊️','🔒','🔓','🔑','🔧','⚙️','🛠️','🆕','🆗','🆙','💎','🏆','🥇','🥈','🥉'] },
  { label: 'Objects', emojis: ['📱','💻','🖥️','⌨️','🖱️','🖲️','🕹️','🗜️','💾','💿','📀','📷','🎥','📹','🎬','📺','📻','☎️','📞','📟','📠','🔌','🔋','💡','🔦','🕯️','📰','🗞️'] },
  { label: 'Faces', emojis: ['🥺','😢','😭','😠','🤬','😤','😡','🤯','😨','😰','😱','🥶','🥵','😬','😴','😪','🤤','🤧','🤒','🤕','🤢','🤮','🥴','😵','🤐','🥱','😯','😦'] },
];

export function RichTextEditor({ content, onChange, placeholder = 'Start typing...', minimal = false }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
      Image,
      Highlight.configure({ multicolor: true }),
      TextStyleWithFontSize,
      Color,
      FontFamily.configure({ types: ['textStyle'] }),
      Subscript,
      Superscript,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const lastExternalContent = useRef(content);
  useEffect(() => {
    if (editor && content !== lastExternalContent.current) {
      lastExternalContent.current = content;
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter image URL:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter URL:');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  const setFontSize = (size: string) => {
    if (!editor) return;
    // Use inline style via TextStyle mark
    editor.chain().focus().setMark('textStyle', { fontSize: `${size}px` } as Record<string, unknown>).run();
  };

  if (!editor) return null;

  return (
    <div className="tiptap-editor border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Toolbar — Word-like, professional */}
      <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
        {/* Row 1: Undo/Redo, font family, size, headings */}
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100 flex-wrap">
          <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Undo (⌘Z)">
            <Undo className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Redo (⇧⌘Z)">
            <Redo className="w-3.5 h-3.5" />
          </ToolbarBtn>

          <Sep />

          {!minimal && (
            <>
              <FontFamilyPicker editor={editor} />
              <FontSizePicker onSize={setFontSize} />
              <Sep />
              <ToolbarBtn
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                active={editor.isActive('heading', { level: 1 })}
                title="Heading 1"
              >
                <Heading1 className="w-3.5 h-3.5" />
              </ToolbarBtn>
              <ToolbarBtn
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                active={editor.isActive('heading', { level: 2 })}
                title="Heading 2"
              >
                <Heading2 className="w-3.5 h-3.5" />
              </ToolbarBtn>
              <ToolbarBtn
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                active={editor.isActive('heading', { level: 3 })}
                title="Heading 3"
              >
                <Heading3 className="w-3.5 h-3.5" />
              </ToolbarBtn>
            </>
          )}
        </div>

        {/* Row 2: Inline marks, color, align, lists, insert */}
        <div className="flex items-center gap-1 px-2 py-1.5 flex-wrap">
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (⌘B)">
            <Bold className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (⌘I)">
            <Italic className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (⌘U)">
            <UnderlineIcon className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
            <Strikethrough className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} title="Subscript">
            <SubscriptIcon className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title="Superscript">
            <SuperscriptIcon className="w-3.5 h-3.5" />
          </ToolbarBtn>

          <Sep />

          <ColorPicker
            label="Text colour"
            icon={<Type className="w-3.5 h-3.5" />}
            colors={TEXT_COLORS}
            onSelect={(c) => editor.chain().focus().setColor(c).run()}
            onClear={() => editor.chain().focus().unsetColor().run()}
          />
          <ColorPicker
            label="Highlight"
            icon={<Highlighter className="w-3.5 h-3.5" />}
            colors={HIGHLIGHT_COLORS}
            onSelect={(c) => c === 'transparent' ? editor.chain().focus().unsetHighlight().run() : editor.chain().focus().toggleHighlight({ color: c }).run()}
            onClear={() => editor.chain().focus().unsetHighlight().run()}
          />

          <Sep />

          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">
            <AlignLeft className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centre">
            <AlignCenter className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">
            <AlignRight className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify">
            <AlignJustify className="w-3.5 h-3.5" />
          </ToolbarBtn>

          <Sep />

          <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
            <List className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolbarBtn>

          {!minimal && (
            <>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
                <Quote className="w-3.5 h-3.5" />
              </ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block">
                <Code className="w-3.5 h-3.5" />
              </ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal divider">
                <Minus className="w-3.5 h-3.5" />
              </ToolbarBtn>

              <Sep />

              <ToolbarBtn onClick={addLink} active={editor.isActive('link')} title="Link">
                <LinkIcon className="w-3.5 h-3.5" />
              </ToolbarBtn>
              <ToolbarBtn onClick={addImage} title="Image">
                <ImageIcon className="w-3.5 h-3.5" />
              </ToolbarBtn>
            </>
          )}

          <EmojiPicker onPick={(emoji) => editor.chain().focus().insertContent(emoji).run()} />

          <Sep />

          <ToolbarBtn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear formatting">
            <RemoveFormatting className="w-3.5 h-3.5" />
          </ToolbarBtn>
        </div>
      </div>

      {/* Editor content */}
      <div className="px-3 py-2.5 min-h-[80px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────

function ToolbarBtn({ onClick, active, children, title }: {
  onClick: () => void; active?: boolean; children: React.ReactNode; title: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={`p-1.5 rounded transition-colors ${
        active ? 'bg-[#171D97] text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
      title={title}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-gray-200 mx-0.5" />;
}

function Popover({ trigger, children, width = 220 }: { trigger: (open: boolean) => React.ReactNode; children: (close: () => void) => React.ReactNode; width?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative" onMouseDown={e => e.stopPropagation()}>
      <div onMouseDown={e => { e.preventDefault(); setOpen(v => !v); }}>{trigger(open)}</div>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-lg shadow-xl" style={{ width }}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function FontFamilyPicker({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const current = editor?.getAttributes('textStyle')?.fontFamily as string | undefined;
  const currentLabel = FONT_FAMILIES.find(f => f.value === current)?.label.replace(' (default)', '').replace(' (display)', '') || 'Inter';

  return (
    <Popover
      width={240}
      trigger={(open) => (
        <button
          type="button"
          className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded border transition-colors ${
            open ? 'border-[#171D97] bg-[#EFF2FF] text-[#171D97]' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
          }`}
          title="Font family"
        >
          <span style={{ fontFamily: current || 'Inter' }} className="w-[80px] truncate text-left">{currentLabel}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      )}
    >
      {(close) => (
        <div className="py-1 max-h-[280px] overflow-y-auto">
          {FONT_FAMILIES.map(f => (
            <button
              key={f.value}
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                editor?.chain().focus().setFontFamily(f.value).run();
                close();
              }}
              className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 transition-colors ${
                current === f.value ? 'bg-[#EFF2FF] text-[#171D97]' : ''
              }`}
              style={{ fontFamily: f.value }}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            onMouseDown={e => {
              e.preventDefault();
              editor?.chain().focus().unsetFontFamily().run();
              close();
            }}
            className="w-full px-3 py-1.5 text-left text-xs text-gray-500 hover:bg-gray-50 border-t border-gray-100"
          >
            Reset to default
          </button>
        </div>
      )}
    </Popover>
  );
}

function FontSizePicker({ onSize }: { onSize: (size: string) => void }) {
  return (
    <Popover
      width={80}
      trigger={(open) => (
        <button
          type="button"
          className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded border transition-colors ${
            open ? 'border-[#171D97] bg-[#EFF2FF] text-[#171D97]' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
          }`}
          title="Font size"
        >
          <span>Size</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      )}
    >
      {(close) => (
        <div className="py-1 max-h-[280px] overflow-y-auto">
          {FONT_SIZES.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={e => { e.preventDefault(); onSize(s); close(); }}
              className="w-full px-3 py-1 text-left text-sm hover:bg-gray-50 transition-colors"
            >
              {s}px
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}

function ColorPicker({ label, icon, colors, onSelect, onClear }: {
  label: string;
  icon: React.ReactNode;
  colors: string[];
  onSelect: (c: string) => void;
  onClear: () => void;
}) {
  const [custom, setCustom] = useState('#000000');
  return (
    <Popover
      width={200}
      trigger={(open) => (
        <button
          type="button"
          className={`flex items-center gap-1 px-1.5 py-1.5 rounded transition-colors ${
            open ? 'bg-[#EFF2FF] text-[#171D97]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
          title={label}
        >
          {icon}
          <ChevronDown className="w-2.5 h-2.5" />
        </button>
      )}
    >
      {(close) => (
        <div className="p-2">
          <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-gray-400 mb-2">{label}</p>
          <div className="grid grid-cols-8 gap-1">
            {colors.map(c => (
              <button
                key={c}
                type="button"
                onMouseDown={e => { e.preventDefault(); onSelect(c); close(); }}
                className="w-5 h-5 rounded border border-gray-200 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100">
            <input
              type="color"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer"
            />
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(custom); close(); }}
              className="flex-1 px-2 py-1 text-xs bg-[#171D97] text-white rounded hover:bg-[#0A0C3F]"
            >
              Use custom
            </button>
          </div>
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); onClear(); close(); }}
            className="w-full mt-1 px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-50 rounded"
          >
            Clear
          </button>
        </div>
      )}
    </Popover>
  );
}

function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [tab, setTab] = useState(0);
  return (
    <Popover
      width={300}
      trigger={(open) => (
        <button
          type="button"
          className={`p-1.5 rounded transition-colors ${
            open ? 'bg-[#EFF2FF] text-[#171D97]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
          title="Insert emoji"
        >
          <Smile className="w-3.5 h-3.5" />
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {EMOJI_GROUPS.map((g, i) => (
              <button
                key={g.label}
                type="button"
                onMouseDown={e => { e.preventDefault(); setTab(i); }}
                className={`px-2.5 py-1.5 text-[10px] font-medium whitespace-nowrap transition-colors ${
                  tab === i ? 'text-[#171D97] border-b-2 border-[#171D97]' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="p-2 grid grid-cols-8 gap-0.5 max-h-[180px] overflow-y-auto">
            {EMOJI_GROUPS[tab]?.emojis.map(e => (
              <button
                key={e}
                type="button"
                onMouseDown={evt => { evt.preventDefault(); onPick(e); close(); }}
                className="text-lg p-1 hover:bg-gray-100 rounded transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </Popover>
  );
}
