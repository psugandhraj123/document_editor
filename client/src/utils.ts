import type { Operation } from "./types/models";

type LocalOp = Omit<Operation, 'opId' | 'userId' | 'docId' | 'baseVersion'>;

export const  diffOperation =(oldText: string, newText: string): LocalOp | null =>{
    if (oldText === newText) return null;
  
    let start = 0;
    while (
      start < oldText.length &&
      start < newText.length &&
      oldText[start] === newText[start]
    ) {
      start++;
    }
  
    let oldEnd = oldText.length - 1;
    let newEnd = newText.length - 1;
    while (
      oldEnd >= start &&
      newEnd >= start &&
      oldText[oldEnd] === newText[newEnd]
    ) {
      oldEnd--;
      newEnd--;
    }
  
    const removed = oldText.slice(start, oldEnd + 1);
    const added = newText.slice(start, newEnd + 1);
  
    if (removed && !added) {
      return {
        kind: "delete",
        index: start,
        length: removed.length,
        prevText: removed,
        timestamp: new Date().toISOString(),
      };
    } else if (!removed && added) {
      return {
        kind: "insert",
        index: start,
        text: added,
        timestamp: new Date().toISOString(),
      };
    } else {
      return {
        kind: "replace",
        index: start,
        length: removed.length,
        text: added,
        prevText: removed,
        timestamp: new Date().toISOString(),
      };
    }
  }

  export const applyEdit = (content: string, op: Operation): string => {

    const { kind, index, text, length, prevText,invert } = op;
  
    switch (kind) {
      case "insert":
        return invert
          ? content.slice(0, index) + content.slice(index + (text?.length || 0)) // undo insert
          : content.slice(0, index) + (text || "") + content.slice(index);       // normal insert
  
      case "delete":
        return invert
          ? content.slice(0, index) + (prevText || "") + content.slice(index)   // undo delete
          : content.slice(0, index) + content.slice(index + (length || 0));     // normal delete
  
      case "replace":
        return invert
          ? content.slice(0, index) + (prevText || "") + content.slice(index + (text?.length || 0)) // undo replace
          : content.slice(0, index) + (text || "") + content.slice(index + (length || 0));         // normal replace
  
      default:
        return content;
    }
  };

  // Normalize line endings to LF so cursor math is consistent across platforms
  const normalizeToLF = (s: string): string => s.replace(/\r\n/g, "\n");

  export const getFinalCursor = (op: Operation): number => {
    const { kind, index, text, prevText, invert } = op;
    const addedLen = text ? normalizeToLF(text).length : 0;
    const prevLen = prevText ? normalizeToLF(prevText).length : 0;
  
    switch (kind) {
      case "insert":
        return invert
          ? index
          : index + addedLen;
  
      case "delete":
        return invert
          ? index + prevLen
          : index;
  
      case "replace":
        return invert
          ? index + prevLen
          : index + addedLen;
  
      default:
        return index;
    }
  };
  
  export const getOperationRange = (op: Operation): { start: number; end: number } => {
    const normalizeToLF = (s: string): string => s.replace(/\r\n/g, "\n");
    const addedLen = op.text ? normalizeToLF(op.text).length : 0;
    const removedLen = op.prevText ? normalizeToLF(op.prevText).length : (op.length || 0);
    // For highlighting, we want the range of affected characters in the final document immediately after the op is applied
    // Non-inverted ops (user actions):
    // - insert: highlight inserted span [index, index+addedLen)
    // - delete: highlight the caret position [index, index) (no span). We'll still emit [index, index)
    // - replace: highlight inserted span [index, index+addedLen)
    // Inverted ops (undo): compute range after inversion is applied
    if (!op.invert) {
      if (op.kind === "insert") {
        return { start: op.index, end: op.index + addedLen };
      }
      if (op.kind === "delete") {
        return { start: op.index, end: op.index };
      }
      // replace
      return { start: op.index, end: op.index + addedLen };
    } else {
      if (op.kind === "insert") {
        // undo insert removes text; highlight position where text was removed
        return { start: op.index, end: op.index };
      }
      if (op.kind === "delete") {
        // undo delete re-inserts prevText
        return { start: op.index, end: op.index + removedLen };
      }
      // undo replace re-inserts prevText
      return { start: op.index, end: op.index + removedLen };
    }
  }

  // Transform a cursor index forward through a just-applied operation
  export function transformCursorForOperation(cursor: number, op: Operation): number {
    const normalizeToLF = (s: string): string => s.replace(/\r\n/g, "\n");
    const addedLenRaw = op.text ? normalizeToLF(op.text).length : 0;
    const removedLenRaw = op.prevText ? normalizeToLF(op.prevText).length : (op.length || 0);

    // Effective effect after considering invert: replace removedLen with addedLen
    const addedLen = op.invert ? removedLenRaw : addedLenRaw;
    const removedLen = op.invert ? addedLenRaw : removedLenRaw;
    const index = op.index;

    if (removedLen === 0 && addedLen > 0) {
      // insert
      if (cursor < index) return cursor;
      return cursor + addedLen;
    }

    if (removedLen > 0 && addedLen === 0) {
      // delete
      if (cursor <= index) return cursor;
      if (cursor <= index + removedLen) return index;
      return cursor - removedLen;
    }

    // replace (remove removedLen then insert addedLen)
    if (cursor <= index) return cursor;
    if (cursor <= index + removedLen) return index + addedLen;
    return cursor + (addedLen - removedLen);
  }
  

 export function transformOpIndex(localOp: Operation, remoteOp: Operation): Operation {
    // Simplified rules for insert/delete OT
    const result = { ...localOp };
  
    if (remoteOp.kind === "insert") {
      if (remoteOp.index <= result.index) {
        result.index += remoteOp.text?.length || 0;
      }
    }
  
    if (remoteOp.kind === "delete") {
      if (remoteOp.index < result.index) {
        result.index -= Math.min(remoteOp.length || 0, result.index - remoteOp.index);
      } else if (
        remoteOp.index < result.index + (result.length || 0)
      ) {
        // Overlap adjustment
        result.length =
          (result.length || 0) - Math.min(remoteOp.length || 0, result.index + (result.length || 0) - remoteOp.index);
      }
    }
  
    return result;
  }
  
  