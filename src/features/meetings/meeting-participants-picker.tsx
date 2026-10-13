"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type MemberOption = {
  userId: string;
  name: string | null;
  email: string;
};

type Props = {
  members: MemberOption[];
  selectedMemberIds: string[];
  guests: string[];
  disabled?: boolean;
  onChange?: (value: { memberIds: string[]; guests: string[] }) => void;
};

export function MeetingParticipantsPicker({
  members,
  selectedMemberIds: initialSelected,
  guests: initialGuests,
  disabled = false,
  onChange,
}: Props) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [guests, setGuests] = useState<string[]>(initialGuests);
  const [guestDraft, setGuestDraft] = useState("");

  const sync = (memberIds: string[], nextGuests: string[]) => {
    setSelected(memberIds);
    setGuests(nextGuests);
    onChange?.({ memberIds, guests: nextGuests });
  };

  const toggle = (userId: string) => {
    const next = selected.includes(userId)
      ? selected.filter((id) => id !== userId)
      : [...selected, userId];
    sync(next, guests);
  };

  const addGuest = () => {
    const name = guestDraft.trim();
    if (!name) return;
    if (guests.some((g) => g.toLowerCase() === name.toLowerCase())) {
      setGuestDraft("");
      return;
    }
    sync(selected, [...guests, name]);
    setGuestDraft("");
  };

  return (
    <div className="flex flex-col gap-3">
      {selected.map((id) => (
        <input key={id} type="hidden" name="memberIds" value={id} />
      ))}
      <input type="hidden" name="guests" value={guests.join("\n")} />

      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">
          Membros do projeto
        </p>
        <ul className="flex max-h-40 flex-col gap-0.5 overflow-y-auto">
          {members.length === 0 && (
            <li className="px-1 py-2 text-xs text-muted-foreground">
              Nenhum membro cadastrado no projeto.
            </li>
          )}
          {members.map((m) => {
            const checked = selected.includes(m.userId);
            return (
              <li key={m.userId}>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                    checked && "bg-accent/70",
                    disabled && "pointer-events-none opacity-60",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(m.userId)}
                    className="size-3.5 accent-primary"
                  />
                  <span className="truncate font-medium">
                    {m.name ?? m.email}
                  </span>
                  {m.name && (
                    <span className="truncate text-xs text-muted-foreground">
                      {m.email}
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">
          Convidados externos
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={guestDraft}
            disabled={disabled}
            placeholder="Nome do participante"
            onChange={(e) => setGuestDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addGuest();
              }
            }}
            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
          <button
            type="button"
            disabled={disabled || !guestDraft.trim()}
            onClick={addGuest}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-40"
          >
            Add
          </button>
        </div>
        {guests.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {guests.map((g) => (
              <li
                key={g}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
              >
                {g}
                {!disabled && (
                  <button
                    type="button"
                    aria-label={`Remover ${g}`}
                    onClick={() =>
                      sync(
                        selected,
                        guests.filter((x) => x !== g),
                      )
                    }
                    className="rounded-full p-0.5 hover:bg-background"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
