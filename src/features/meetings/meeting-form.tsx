"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MEETING_TYPES } from "@/schemas/meetings";
import {
  createMeetingAction,
  updateMeetingAction,
  deleteMeetingAction,
  type MeetingFormState,
} from "@/features/meetings/actions";
import { RichTextEditor } from "@/features/meetings/rich-text-editor";
import {
  MeetingParticipantsPicker,
  type MemberOption,
} from "@/features/meetings/meeting-participants-picker";
import {
  AlignLeft,
  Calendar,
  Check,
  ChevronDown,
  FileUp,
  Link2,
  Lock,
  Save,
  Share2,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ImportMeetingDialog } from "@/features/meetings/import-meeting-dialog";
import type { MeetingImportDraft } from "@/services/meeting-import";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function useDismissOnOutside(
  open: boolean,
  onClose: () => void,
  containerRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (containerRef.current?.contains(target)) return;
      onClose();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    // Próximo tick evita fechar no mesmo clique que abriu o popup.
    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", onPointerDown);
      document.addEventListener("touchstart", onPointerDown);
      document.addEventListener("keydown", onKeyDown);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, containerRef]);
}

const TYPE_LABELS: Record<(typeof MEETING_TYPES)[number], string> = {
  ATA: "ATA",
  DAILY: "Daily",
  HANDS_ON: "Hands On",
};

function toDatetimeLocal(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type MeetingFormProps = {
  mode: "create" | "edit";
  projectId: string;
  projectName: string;
  meetingId?: string;
  canEdit: boolean;
  members: MemberOption[];
  shareOrigin?: string;
  initialValues?: {
    title: string;
    type: (typeof MEETING_TYPES)[number];
    heldAt: string | Date;
    integrationId: string | null;
    description: string;
    published: boolean;
    shareToken: string | null;
    memberIds: string[];
    guests: string[];
  };
};

export function MeetingForm(props: MeetingFormProps) {
  const router = useRouter();
  const initial = props.initialValues;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState<(typeof MEETING_TYPES)[number]>(
    initial?.type ?? "ATA",
  );
  const [heldAt, setHeldAt] = useState(
    () => toDatetimeLocal(initial?.heldAt) || toDatetimeLocal(new Date()),
  );
  const [descriptionHtml, setDescriptionHtml] = useState(
    initial?.description ?? "",
  );
  const [descriptionKey, setDescriptionKey] = useState(0);
  const [published, setPublished] = useState(initial?.published ?? false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const participantsRef = useRef<HTMLDivElement>(null);

  const [selectedMemberIds, setSelectedMemberIds] = useState(
    initial?.memberIds ?? [],
  );
  const [guests, setGuests] = useState(initial?.guests ?? []);

  function applyImportDraft(draft: MeetingImportDraft) {
    setTitle(draft.title);
    setType(draft.type);
    setHeldAt(draft.heldAt);
    setDescriptionHtml(draft.descriptionHtml);
    setDescriptionKey((k) => k + 1);
    setSelectedMemberIds(draft.memberIds);
    setGuests(draft.guests);
  }

  useDismissOnOutside(shareOpen, () => setShareOpen(false), shareRef);
  useDismissOnOutside(
    participantsOpen,
    () => setParticipantsOpen(false),
    participantsRef,
  );

  const bound =
    props.mode === "create"
      ? createMeetingAction.bind(null, props.projectId)
      : updateMeetingAction.bind(null, props.meetingId!, props.projectId);

  const [state, formAction, pending] = useActionState<
    MeetingFormState,
    FormData
  >(bound, undefined);

  useEffect(() => {
    if (state?.ok) {
      router.push(`/projects/${state.projectId}/meetings/${state.meetingId}`);
      router.refresh();
    }
  }, [state, router]);

  const shareUrl =
    published && initial?.shareToken && props.shareOrigin
      ? `${props.shareOrigin}/share/m/${initial.shareToken}`
      : null;

  const participantSummary = useMemo(() => {
    const names = [
      ...props.members
        .filter((m) => selectedMemberIds.includes(m.userId))
        .map((m) => m.name ?? m.email),
      ...guests,
    ];
    if (names.length === 0) return "Vazio";
    if (names.length <= 6) return names.join(", ");
    return `${names.slice(0, 6).join(", ")} +${names.length - 6}`;
  }, [props.members, selectedMemberIds, guests]);

  const fieldErr = (key: string) =>
    state && !state.ok ? state.fieldErrors?.[key] : undefined;

  return (
    <>
    <form action={formAction} className="flex flex-col">
      {/* Top bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <nav className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() =>
              router.push(`/projects/${props.projectId}/meetings`)
            }
            className="hover:text-foreground"
          >
            Registro de ATAs
          </button>
          <span>/</span>
          <span className="truncate text-foreground/80">
            {title.trim() || "Nova reunião"}
          </span>
        </nav>
        <div className="flex items-center gap-2">
          {props.canEdit && props.mode === "create" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
            >
              <FileUp className="size-3.5" />
              Importar
            </Button>
          )}
          {props.canEdit && (
            <Button type="submit" size="sm" disabled={pending}>
              <Save className="size-3.5" />
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          )}
          <div className="relative" ref={shareRef}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShareOpen((v) => !v)}
            >
              <Lock className="size-3.5" />
              Compartilhar
            </Button>
            {shareOpen && (
              <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-border bg-popover p-3 shadow-lg">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="published"
                    value="true"
                    disabled={!props.canEdit}
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <span>
                    <span className="font-medium">Compartilhar documento</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Libera o shared link para pessoas externas.
                    </span>
                  </span>
                </label>
                {shareUrl ? (
                  <div className="mt-3 flex items-center gap-2">
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 truncate text-xs text-primary underline"
                    >
                      {shareUrl}
                    </a>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await navigator.clipboard.writeText(shareUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                    >
                      {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
                      {copied ? "OK" : "Copiar"}
                    </Button>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {published
                      ? "Salve para gerar o link."
                      : "Marque como publicada e salve para gerar o link."}
                  </p>
                )}
                {!published && (
                  <input type="hidden" name="published" value="false" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {(state && !state.ok) || deleteError ? (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {deleteError ?? (state && !state.ok ? state.error : null)}
        </p>
      ) : null}

      {/* Document title */}
      <input
        name="title"
        required
        disabled={!props.canEdit}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título da reunião"
        className="w-full border-0 bg-transparent text-3xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/50 disabled:opacity-70 md:text-4xl"
      />
      {fieldErr("title") && (
        <p className="mt-1 text-xs text-destructive">{fieldErr("title")}</p>
      )}

      {/* Notion-like properties */}
      <div className="mt-6 flex flex-col gap-0.5 text-sm">
        <PropRow icon={Calendar} label="Data" error={fieldErr("heldAt")}>
          <input
            type="datetime-local"
            name="heldAt"
            required
            disabled={!props.canEdit}
            value={heldAt}
            onChange={(e) => setHeldAt(e.target.value)}
            className="w-full min-w-0 border-0 bg-transparent py-1 outline-none disabled:opacity-70"
          />
        </PropRow>

        <PropRow icon={AlignLeft} label="Integration ID" error={fieldErr("integrationId")}>
          <input
            name="integrationId"
            disabled={!props.canEdit}
            defaultValue={initial?.integrationId ?? ""}
            placeholder="Vazio"
            className="w-full min-w-0 border-0 bg-transparent py-1 outline-none placeholder:text-muted-foreground/70 disabled:opacity-70"
          />
        </PropRow>

        <div ref={participantsRef}>
          <PropRow icon={Users} label="Participantes">
            <button
              type="button"
              disabled={!props.canEdit}
              onClick={() => setParticipantsOpen((v) => !v)}
              className="flex w-full items-center gap-2 py-1 text-left disabled:opacity-70"
            >
              <span
                className={cn(
                  "min-w-0 flex-1 truncate",
                  participantSummary === "Vazio" && "text-muted-foreground/70",
                )}
              >
                {participantSummary}
              </span>
              <ChevronDown
                className={cn(
                  "size-3.5 shrink-0 text-muted-foreground transition-transform",
                  participantsOpen && "rotate-180",
                )}
              />
            </button>
          </PropRow>
          {participantsOpen && (
            <div className="mb-2 ml-[9.5rem] rounded-lg border border-border bg-card p-3">
              <MeetingParticipantsPicker
                members={props.members}
                selectedMemberIds={selectedMemberIds}
                guests={guests}
                disabled={!props.canEdit}
                onChange={({ memberIds, guests: nextGuests }) => {
                  setSelectedMemberIds(memberIds);
                  setGuests(nextGuests);
                }}
              />
            </div>
          )}
        </div>
        {!participantsOpen && (
          <>
            {selectedMemberIds.map((id) => (
              <input key={id} type="hidden" name="memberIds" value={id} />
            ))}
            <input type="hidden" name="guests" value={guests.join("\n")} />
          </>
        )}

        <PropRow icon={Tag} label="Projeto">
          <span className="inline-flex rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300">
            {props.projectName}
          </span>
        </PropRow>

        <PropRow icon={Share2} label="Compartilhado">
          <button
            type="button"
            disabled={!props.canEdit}
            onClick={() => {
              if (!props.canEdit) return;
              const next = !published;
              setPublished(next);
              if (next) setShareOpen(true);
            }}
            title={
              published
                ? "Documento compartilhado — clique para desativar"
                : "Documento privado — clique para compartilhar"
            }
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-70",
              published
                ? "bg-sky-500/15 text-sky-700 hover:bg-sky-500/25 dark:text-sky-300"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {published ? (
              <>
                <Share2 className="size-3.5" />
                Sim
              </>
            ) : (
              <>
                <Lock className="size-3.5" />
                Não
              </>
            )}
          </button>
          {published && !shareOpen && (
            <input type="hidden" name="published" value="true" />
          )}
        </PropRow>

        <PropRow icon={Tag} label="Tipo" error={fieldErr("type")}>
          <input type="hidden" name="type" value={type} />
          <div className="flex flex-wrap gap-1.5 py-0.5">
            {MEETING_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                disabled={!props.canEdit}
                onClick={() => setType(t)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-70",
                  type === t
                    ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted",
                )}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </PropRow>
      </div>

      <div className="my-8 border-t border-border/70" />

      {/* Large description body */}
      <RichTextEditor
        key={descriptionKey}
        name="description"
        defaultValue={descriptionHtml}
        disabled={!props.canEdit}
        variant="document"
        placeholder="Escreva o resumo detalhado da reunião…"
      />

      {props.mode === "edit" && props.canEdit && props.meetingId && (
        <div className="mt-10 flex justify-end border-t border-border/60 pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={deleting}
            className="text-destructive hover:bg-destructive/10"
            onClick={() => {
              setDeleteError(null);
              setConfirmDelete(true);
            }}
          >
            <Trash2 className="size-3.5" />
            Excluir
          </Button>
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={(next) => {
              if (deleting) return;
              setConfirmDelete(next);
              if (!next) setDeleteError(null);
            }}
            title="Excluir esta reunião?"
            description="Esta ação não pode ser desfeita."
            confirmLabel="Sim, excluir"
            pending={deleting}
            pendingLabel="Excluindo…"
            error={deleteError}
            onConfirm={() => {
              startDelete(async () => {
                const res = await deleteMeetingAction(props.meetingId!);
                if (!res.ok) {
                  setDeleteError(res.error);
                  return;
                }
                setConfirmDelete(false);
                router.push(`/projects/${res.projectId}/meetings`);
                router.refresh();
              });
            }}
          />
        </div>
      )}
    </form>

    {props.mode === "create" && props.canEdit && (
      <ImportMeetingDialog
        projectId={props.projectId}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={applyImportDraft}
      />
    )}
    </>
  );
}

function PropRow({
  icon: Icon,
  label,
  error,
  children,
}: {
  icon: React.ElementType;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group">
      <div className="grid grid-cols-[9rem_1fr] items-start gap-2 rounded-md px-1 py-1 hover:bg-muted/40">
        <div className="flex items-center gap-2 py-1 text-muted-foreground">
          <Icon className="size-3.5 shrink-0" />
          <span className="text-sm">{label}</span>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
      {error && (
        <p className="ml-[9.5rem] text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
