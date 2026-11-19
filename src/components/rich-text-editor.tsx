"use client";

import { useEffect } from "react";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  BoldIcon,
  CodeIcon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  type LucideIcon,
  QuoteIcon,
  Redo2Icon,
  StrikethroughIcon,
  UnderlineIcon,
  Undo2Icon,
  UnlinkIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

interface RichTextEditorProps {
  /** HTML. The backend sanitises it again on save and returns it as saved. */
  value: string;
  onChange: (html: string) => void;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** Smaller minimum height, for notes. */
  compact?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
}

// Formats the backend keeps when it sanitises rich text: paragraphs, h2 to h4, emphasis,
// lists, quotes, code and links. Module scope, so the editor is not rebuilt on every render.
const EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [2, 3, 4] },
    link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer nofollow" } },
  }),
];

/** An empty document is saved as no text, not as an empty paragraph. */
function toHtml(editor: Editor) {
  return editor.isEmpty ? "" : editor.getHTML();
}

/**
 * Visual editor for rich-text fields and rich notes (Tiptap). It writes plain HTML with
 * the tags the backend allows.
 */
export function RichTextEditor({
  value,
  onChange,
  id,
  disabled = false,
  invalid = false,
  compact = false,
  ...aria
}: RichTextEditorProps) {
  const t = useTranslations("editor");
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: value,
    editable: !disabled,
    // The page is prerendered without a document; the editor mounts in the browser.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        role: "textbox",
        "aria-multiline": "true",
        ...(aria["aria-label"] ? { "aria-label": aria["aria-label"] } : {}),
        ...(aria["aria-describedby"] ? { "aria-describedby": aria["aria-describedby"] } : {}),
        class: cn(
          "max-w-none px-3 py-2 text-sm leading-relaxed outline-none",
          compact ? "min-h-20" : "min-h-36",
          "[&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.8125rem] [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_h4]:font-medium [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-[0.8125rem] [&_ul]:list-disc [&_ul]:pl-5",
        ),
      },
    },
    onUpdate: ({ editor: current }) => onChange(toHtml(current)),
  });

  // The value changed from outside (reset, suggestion, newer version of the record).
  useEffect(() => {
    if (editor && value !== toHtml(editor)) editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const setLink = () => {
    if (!editor) return;
    const previous = (editor.getAttributes("link").href as string | undefined) ?? "";
    const href = window.prompt(t("linkPrompt"), previous);
    if (href === null) return;
    const url = href.trim();
    if (url === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else if (/^(https?:\/\/|mailto:|tel:|\/)/i.test(url)) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-input bg-card focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        invalid && "border-destructive",
        disabled && "opacity-60",
      )}
    >
      <div role="toolbar" aria-label={t("toolbar")} className="flex flex-wrap gap-0.5 border-b bg-muted/40 p-1">
        <Tool editor={editor} disabled={disabled} label={t("bold")} icon={BoldIcon} active="bold" run={(e) => e.chain().focus().toggleBold().run()} />
        <Tool editor={editor} disabled={disabled} label={t("italic")} icon={ItalicIcon} active="italic" run={(e) => e.chain().focus().toggleItalic().run()} />
        <Tool editor={editor} disabled={disabled} label={t("underline")} icon={UnderlineIcon} active="underline" run={(e) => e.chain().focus().toggleUnderline().run()} />
        <Tool editor={editor} disabled={disabled} label={t("strike")} icon={StrikethroughIcon} active="strike" run={(e) => e.chain().focus().toggleStrike().run()} />
        <Tool editor={editor} disabled={disabled} label={t("code")} icon={CodeIcon} active="code" run={(e) => e.chain().focus().toggleCode().run()} />
        <Divider />
        <Tool editor={editor} disabled={disabled} label={t("heading2")} icon={Heading2Icon} active={["heading", { level: 2 }]} run={(e) => e.chain().focus().toggleHeading({ level: 2 }).run()} />
        <Tool editor={editor} disabled={disabled} label={t("heading3")} icon={Heading3Icon} active={["heading", { level: 3 }]} run={(e) => e.chain().focus().toggleHeading({ level: 3 }).run()} />
        <Tool editor={editor} disabled={disabled} label={t("bulletList")} icon={ListIcon} active="bulletList" run={(e) => e.chain().focus().toggleBulletList().run()} />
        <Tool editor={editor} disabled={disabled} label={t("orderedList")} icon={ListOrderedIcon} active="orderedList" run={(e) => e.chain().focus().toggleOrderedList().run()} />
        <Tool editor={editor} disabled={disabled} label={t("quote")} icon={QuoteIcon} active="blockquote" run={(e) => e.chain().focus().toggleBlockquote().run()} />
        <Divider />
        <Tool editor={editor} disabled={disabled} label={t("link")} icon={LinkIcon} active="link" run={setLink} />
        <Tool editor={editor} disabled={disabled} label={t("unlink")} icon={UnlinkIcon} run={(e) => e.chain().focus().unsetLink().run()} />
        <Divider />
        <Tool editor={editor} disabled={disabled} label={t("undo")} icon={Undo2Icon} run={(e) => e.chain().focus().undo().run()} />
        <Tool editor={editor} disabled={disabled} label={t("redo")} icon={Redo2Icon} run={(e) => e.chain().focus().redo().run()} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="mx-0.5 w-px self-stretch bg-border" />;
}

function Tool({
  editor,
  disabled,
  label,
  icon: Icon,
  active,
  run,
}: {
  editor: Editor | null;
  disabled: boolean;
  label: string;
  icon: LucideIcon;
  /** Mark or node name (optionally with attributes) that lights the button up. */
  active?: string | [string, Record<string, unknown>];
  run: (editor: Editor) => void;
}) {
  const isActive = editor && active ? (typeof active === "string" ? editor.isActive(active) : editor.isActive(...active)) : false;

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active ? isActive : undefined}
      disabled={disabled || !editor}
      // Keep the selection in the editor when a tool is clicked.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => editor && run(editor)}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 [&_svg]:size-3.5",
        isActive && "bg-accent text-foreground",
      )}
    >
      <Icon />
    </button>
  );
}
