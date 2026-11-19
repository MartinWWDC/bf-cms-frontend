"use client";

import { type FormEvent, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, BookmarkIcon, StarIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useErrorToast } from "@/lib/api/use-error-message";

import { useDeleteSavedView, useOrderSavedViews, useSaveView } from "../mutations";
import type { SavedView, SavedViewInput } from "../types";

interface SavedViewsMenuProps {
  resource: string;
  views: SavedView[];
  /** The saved view in use, if any. */
  active: SavedView | null;
  /** What the admin is looking at now: view, tab, filter, sort, columns, grouping. */
  current: SavedViewInput;
  /** The list differs from the saved view in use. */
  isDirty: boolean;
  onOpen: (view: SavedView | null) => void;
}

/**
 * Personal saved views of a resource: open one, save the current list under a name,
 * update, rename, reorder, delete, and mark one as the default that opens with the resource.
 */
export function SavedViewsMenu({ resource, views, active, current, isDirty, onOpen }: SavedViewsMenuProps) {
  const t = useTranslations("resources.savedViews");
  const tCommon = useTranslations("common");
  const toastError = useErrorToast();
  const save = useSaveView(resource);
  const remove = useDeleteSavedView(resource);
  const order = useOrderSavedViews(resource);
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<{ mode: "create" } | { mode: "rename"; view: SavedView } | null>(null);
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const move = (index: number, by: number) => {
    const ids = views.map((view) => view.id);
    const target = index + by;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    order.mutate(ids, { onError: toastError });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!dialog || !name.trim()) return;
    const input: SavedViewInput =
      dialog.mode === "create"
        ? { ...current, name: name.trim(), is_default: isDefault }
        : { name: name.trim(), is_default: isDefault };
    save.mutate(
      { id: dialog.mode === "rename" ? dialog.view.id : undefined, input },
      {
        onSuccess: (view) => {
          toast.success(t("saved", { name: view.name }));
          setDialog(null);
          if (dialog.mode === "create") onOpen(view);
        },
        onError: toastError,
      },
    );
  };

  const iconButton =
    "flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 [&_svg]:size-3.5";

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant="outline" size="sm" className={cn(active && "border-brand/60")} />}>
          <BookmarkIcon />
          <span className="max-w-40 truncate">{active ? active.name : t("button")}</span>
          {active && isDirty ? <span aria-label={t("changed")} className="size-1.5 rounded-full bg-brand" /> : null}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 gap-2">
          {views.length === 0 ? (
            <p className="px-1 py-2 text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="scrollbar-slim -mx-1 max-h-72 overflow-y-auto">
              {views.map((view, index) => (
                <li key={view.id} className="flex items-center gap-0.5 rounded-md px-1 hover:bg-accent/60">
                  <button
                    type="button"
                    onClick={() => {
                      onOpen(view);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left text-sm outline-none focus-visible:underline",
                      view.id === active?.id && "font-medium",
                    )}
                  >
                    <span className="truncate">{view.name}</span>
                    {view.is_default ? <StarIcon aria-label={t("default")} className="size-3 shrink-0 fill-current text-brand" /> : null}
                  </button>
                  <button type="button" className={iconButton} disabled={index === 0 || order.isPending} aria-label={t("moveUp")} onClick={() => move(index, -1)}>
                    <ArrowUpIcon />
                  </button>
                  <button type="button" className={iconButton} disabled={index === views.length - 1 || order.isPending} aria-label={t("moveDown")} onClick={() => move(index, 1)}>
                    <ArrowDownIcon />
                  </button>
                  <button
                    type="button"
                    className={iconButton}
                    aria-label={view.is_default ? t("unsetDefault") : t("setDefault")}
                    title={view.is_default ? t("unsetDefault") : t("setDefault")}
                    disabled={save.isPending}
                    onClick={() => save.mutate({ id: view.id, input: { is_default: !view.is_default } }, { onError: toastError })}
                  >
                    <StarIcon className={cn(view.is_default && "fill-current")} />
                  </button>
                  <button
                    type="button"
                    className={iconButton}
                    aria-label={t("delete")}
                    title={t("delete")}
                    disabled={remove.isPending}
                    onClick={() =>
                      remove.mutate(view.id, {
                        onSuccess: () => {
                          toast.success(t("deleted", { name: view.name }));
                          if (view.id === active?.id) onOpen(null);
                        },
                        onError: toastError,
                      })
                    }
                  >
                    <Trash2Icon />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-1.5 border-t pt-2">
            <Button
              size="sm"
              onClick={() => {
                setName("");
                setIsDefault(false);
                setDialog({ mode: "create" });
                setOpen(false);
              }}
            >
              {t("saveAsNew")}
            </Button>
            {active ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!isDirty || save.isPending}
                  onClick={() =>
                    save.mutate(
                      { id: active.id, input: current },
                      {
                        onSuccess: (view) => {
                          toast.success(t("saved", { name: view.name }));
                          onOpen(view);
                          setOpen(false);
                        },
                        onError: toastError,
                      },
                    )
                  }
                >
                  {t("update")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setName(active.name);
                    setIsDefault(active.is_default);
                    setDialog({ mode: "rename", view: active });
                    setOpen(false);
                  }}
                >
                  {t("rename")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onOpen(null);
                    setOpen(false);
                  }}
                >
                  {t("leave")}
                </Button>
              </>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={dialog !== null} onOpenChange={(next) => !next && setDialog(null)}>
        <DialogContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{dialog?.mode === "rename" ? t("renameTitle") : t("saveTitle")}</DialogTitle>
              <DialogDescription>{t("saveDescription")}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="saved-view-name">{t("name")}</Label>
              <Input id="saved-view-name" autoFocus value={name} maxLength={100} onChange={(event) => setName(event.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isDefault} onCheckedChange={(checked) => setIsDefault(checked === true)} />
              {t("makeDefault")}
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={save.isPending || !name.trim()}>
                {tCommon("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
