"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, FontSize, FontFamily, Color } from "@tiptap/extension-text-style";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Heading2,
  Undo2,
  Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px"] as const;
const FONT_FAMILIES = [
  { label: "Padrão", value: "" },
  { label: "Sans", value: "ui-sans-serif, system-ui, sans-serif" },
  { label: "Serif", value: "ui-serif, Georgia, serif" },
  { label: "Mono", value: "ui-monospace, monospace" },
] as const;

type Props = {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  /** document = corpo amplo estilo Notion, sem caixa */
  variant?: "boxed" | "document";
};

function ToolbarButton({
  active,
  disabled,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40",
        active && "bg-accent text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  name,
  defaultValue = "",
  placeholder = "Descreva a reunião…",
  disabled = false,
  variant = "boxed",
}: Props) {
  const [html, setHtml] = useState(defaultValue || "");
  const isDocument = variant === "document";

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      TextStyle,
      FontSize,
      FontFamily,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: defaultValue || "",
    onUpdate: ({ editor: ed }) => setHtml(ed.getHTML()),
    editorProps: {
      attributes: {
        class: cn(
          "prose-meeting max-w-none outline-none",
          isDocument
            ? "min-h-[55vh] px-0 py-2 text-base leading-7"
            : "min-h-[220px] px-3 py-2 text-sm",
        ),
      },
    },
  });

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [editor, disabled]);

  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL do link", prev ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  };

  return (
    <div
      className={cn(
        "bg-background",
        !isDocument && "overflow-hidden rounded-md border border-input",
        disabled && "opacity-70",
      )}
    >
      <input type="hidden" name={name} value={html} readOnly />
      <div
        className={cn(
          "flex flex-wrap items-center gap-0.5 px-1.5 py-1",
          isDocument
            ? "sticky top-0 z-10 mb-2 rounded-lg border border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
            : "border-b border-border bg-muted/40",
        )}
      >
        <ToolbarButton
          title="Negrito"
          disabled={disabled}
          active={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Itálico"
          disabled={disabled}
          active={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Sublinhado"
          disabled={disabled}
          active={editor?.isActive("underline")}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Título"
          disabled={disabled}
          active={editor?.isActive("heading", { level: 2 })}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="size-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          title="Lista"
          disabled={disabled}
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Lista numerada"
          disabled={disabled}
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          title="Alinhar à esquerda"
          disabled={disabled}
          active={editor?.isActive({ textAlign: "left" })}
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Centralizar"
          disabled={disabled}
          active={editor?.isActive({ textAlign: "center" })}
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Alinhar à direita"
          disabled={disabled}
          active={editor?.isActive({ textAlign: "right" })}
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Link"
          disabled={disabled}
          active={editor?.isActive("link")}
          onClick={setLink}
        >
          <Link2 className="size-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <select
          disabled={disabled}
          className="h-8 rounded-md border-0 bg-transparent px-1 text-xs outline-none"
          title="Tamanho da fonte"
          value={
            (editor?.getAttributes("textStyle").fontSize as string) || ""
          }
          onChange={(e) => {
            const v = e.target.value;
            if (!v) editor?.chain().focus().unsetFontSize().run();
            else editor?.chain().focus().setFontSize(v).run();
          }}
        >
          <option value="">Tamanho</option>
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          disabled={disabled}
          className="h-8 max-w-[110px] rounded-md border-0 bg-transparent px-1 text-xs outline-none"
          title="Fonte"
          value={
            (editor?.getAttributes("textStyle").fontFamily as string) || ""
          }
          onChange={(e) => {
            const v = e.target.value;
            if (!v) editor?.chain().focus().unsetFontFamily().run();
            else editor?.chain().focus().setFontFamily(v).run();
          }}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <input
          type="color"
          disabled={disabled}
          title="Cor do texto"
          className="ml-1 size-7 cursor-pointer rounded border-0 bg-transparent p-0"
          value={
            (editor?.getAttributes("textStyle").color as string) || "#1e293b"
          }
          onChange={(e) =>
            editor?.chain().focus().setColor(e.target.value).run()
          }
        />
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          title="Desfazer"
          disabled={disabled}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Refazer"
          disabled={disabled}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 className="size-3.5" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
