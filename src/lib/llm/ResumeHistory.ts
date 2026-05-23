import {
  compare, // generates diff between two objects
  applyPatch, // applies a patch to an object
  deepClone,
} from "fast-json-patch";

import { ResumeJSON } from "@/types/resume";

import type { Operation } from "fast-json-patch";

type HistoryEntry = {
  patch: Operation[]; // forward: what changed
  inversePatch: Operation[]; // backward: how to undo
  label: string;
};
export type HistoryChangeListener = (
  canUndo: boolean,
  canRedo: boolean,
  redoLabel: string | null,
  undoLabel: string | null
) => void;
export class ResumeHistory {
  private entries: HistoryEntry[] = [];
  private currentState: ResumeJSON;
  private pointer = -1; // supports redo too

  onHistoryChangeEvents: HistoryChangeListener[] = [];

  constructor(resume: ResumeJSON) {
    this.currentState = deepClone(resume);
    this.entries = [];
    this.pointer = -1;
  }

  addHistoryChangeListener(listener: HistoryChangeListener) {
    this.onHistoryChangeEvents.push(listener);
  }

  private emitHistoryChange() {
    const canUndo = this.canUndo();
    const canRedo = this.canRedo();
    const redoLabel = canRedo ? this.entries[this.pointer + 1].label : null;
    const undoLabel = canUndo ? this.entries[this.pointer].label : null;
    this.onHistoryChangeEvents.forEach((listener) =>
      listener(canUndo, canRedo, redoLabel, undoLabel)
    );
  }

  removeHistoryChangeListener(listener: HistoryChangeListener) {
    this.onHistoryChangeEvents = this.onHistoryChangeEvents.filter(
      (l) => l !== listener
    );
  }

  addEntry(next: ResumeJSON, label: string) {
    const patch = compare(this.currentState, next);
    if (patch.length === 0) return; // nothing changed, skip

    const inversePatch = compare(next, this.currentState);

    // If we're in the middle of history, discard redo entries
    this.entries = this.entries.slice(0, this.pointer + 1);

    this.entries.push({ patch, inversePatch, label });
    this.pointer++;

    this.currentState = deepClone(next);
    this.emitHistoryChange();
  }

  undo(): ResumeJSON | null {
    if (this.pointer < 0) return null;

    const { inversePatch } = this.entries[this.pointer];
    this.pointer--;

    const result = applyPatch(
      deepClone(this.currentState),
      inversePatch
    ).newDocument;
    this.currentState = result;
    this.emitHistoryChange();
    return result;
  }

  redo(): ResumeJSON | null {
    if (this.pointer >= this.entries.length - 1) return null;

    this.pointer++;
    const { patch } = this.entries[this.pointer];

    const result = applyPatch(deepClone(this.currentState), patch).newDocument;
    this.currentState = result;
    this.emitHistoryChange();
    return result;
  }

  canUndo() {
    return this.pointer >= 0;
  }

  canRedo() {
    return this.pointer < this.entries.length - 1;
  }
}
