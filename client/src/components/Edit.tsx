import { useEffect, useRef, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../app/store";
import { store } from "../app/store";
import { diffOperation } from "../utils";
import { undoWithPresenceUpdate, redoWithPresenceUpdate, applyOperationWithPresenceUpdate, computeAndBroadcastBulkPresence, removePresenceAndBroadcast } from "../app/thunks";
import { v4 as uuidv4 } from "uuid";

export default function Block() {
  const dispatch = useDispatch<AppDispatch>();
  const ref = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const suppressSelectionBroadcastRef = useRef(false);
  const suppressSelectionTimeoutRef = useRef<number | undefined>(undefined);
  const isFocusedRef = useRef(false);

  const suppressSelectionBroadcastFor = useCallback((durationMs: number = 150) => {
    suppressSelectionBroadcastRef.current = true;
    if (suppressSelectionTimeoutRef.current !== undefined) {
      window.clearTimeout(suppressSelectionTimeoutRef.current);
    }
    suppressSelectionTimeoutRef.current = window.setTimeout(() => {
      suppressSelectionBroadcastRef.current = false;
    }, durationMs);
  }, []);

  const doc = useSelector((state: RootState) => state.doc);
  const presence = useSelector((state: RootState) => state.presence);


  const { userId } = useSelector((state: RootState) => state.auth);
  const sessionId = sessionStorage.getItem('editorSessionId');
  const reduxCursorPos = sessionId && presence[sessionId] ? presence[sessionId]?.cursor : 0;



  const [overlays, setOverlays] = useState<Array<{
    sessionId: string;
    name: string;
    color: string; // caret color
    labelBg: string; // tag background color
    border: string; // tag border color
    top: number;
    left: number;
    height: number;
  }>>([]);

  const [highlights, setHighlights] = useState<Array<{
    sessionId: string;
    color: string;
    rects: Array<{ top: number; left: number; width: number; height: number }>;
  }>>([]);

  useEffect(() => {
    // Only sync caret to Redux when editor is focused
    if (!ref.current || document.activeElement !== ref.current) return;
    if (reduxCursorPos !== undefined) {
      const currentPosition = getCursorPosition(ref);
      if (currentPosition !== reduxCursorPos) {
        setTimeout(() => {
          suppressSelectionBroadcastFor(120);
          updateCursorPosition(reduxCursorPos, ref);
        }, 0);
      }
    }
  }, [reduxCursorPos, suppressSelectionBroadcastFor]); // Removed ref from dependencies to prevent infinite re-renders




  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.textContent !== doc.content) {
      const wasFocused = document.activeElement === ref.current;
      ref.current.textContent = doc.content;
      if (wasFocused) {
        suppressSelectionBroadcastFor(120);
        updateCursorPosition(reduxCursorPos, ref);
      }
    }
  }, [doc.content, reduxCursorPos, suppressSelectionBroadcastFor]);

  // Compute and update remote cursor overlays and latest-op highlights when presence/doc/size changes
  useEffect(() => {
    const computeOverlays = () => {
      if (!ref.current || !wrapperRef.current) {
        setOverlays([]);
        setHighlights([]);
        return;
      }
      
      const wrapperRect = wrapperRef.current.getBoundingClientRect();
      const list: Overlay[] = [];

      const highlightList: Highlight[] = [];

      const entries = Object.values(presence as Record<string, PresenceEntry>);
      const { start, end } = getSelectionInfo(ref);
      const localHasSelection = start !== end;
      for (const p of entries) {
        if (!p) continue;
        const isLocal = !!sessionId && p.sessionId === sessionId;
        const colors = sessionIdToColors(p.sessionId);

        if (!isLocal) {
          const caretRect = getCaretRectAtIndex(ref.current, p.cursor ?? 0);
          if (caretRect) {
            list.push({
              sessionId: p.sessionId,
              name: p.name,
              color: colors.caret,
              labelBg: colors.labelBg,
              border: colors.border,
              top: caretRect.top - wrapperRect.top + (ref.current.scrollTop || 0),
              left: caretRect.left - wrapperRect.left + (ref.current.scrollLeft || 0),
              height: caretRect.height || 16,
            });
          }
        }

        const opStart = p.opStart as number | undefined;
        const opEnd = p.opEnd as number | undefined;
        if (typeof opStart === 'number' && typeof opEnd === 'number' && opEnd >= opStart) {
          if (localHasSelection) {
            continue;
          }
          const rects = getRangeRects(ref.current, opStart, opEnd);
          if (rects && rects.length > 0) {
            const hlRects = rects.map(r => ({
              top: r.top - wrapperRect.top + (ref.current!.scrollTop || 0),
              left: r.left - wrapperRect.left + (ref.current!.scrollLeft || 0),
              width: r.width,
              height: r.height || 16,
            }));
            highlightList.push({
              sessionId: p.sessionId,
              color: colors.labelBg,
              rects: hlRects,
            });
          }
        }
      }
      setOverlays(list);
      setHighlights(highlightList);
    };

    const raf = requestAnimationFrame(() => computeOverlays());
    return () => cancelAnimationFrame(raf);
  }, [presence, doc.content, sessionId]);

  

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        suppressSelectionBroadcastFor(150);
        dispatch(undoWithPresenceUpdate())
      } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
        suppressSelectionBroadcastFor(150);
        dispatch(redoWithPresenceUpdate())
      }
    }
  }, [dispatch, suppressSelectionBroadcastFor]);

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    suppressSelectionBroadcastFor(100);
    const raw = e.currentTarget.innerText;
    const newText = raw.replace(/\r\n/g, '\n');
    if (newText !== doc.content) {
      const op = diffOperation(doc.content, newText);
      if (op) {
        dispatch(applyOperationWithPresenceUpdate({
          ...op,
          opId: uuidv4(),
          userId: userId,
          docId: doc.id,
          baseVersion: doc.version,
          timestamp: new Date().toISOString(),
        }));
      }
    }
  }, [dispatch, doc.content, doc.id, doc.version, userId, suppressSelectionBroadcastFor]);

  const broadcastCurrentPresence = useCallback(() => {
    if (!ref.current) return;
    if (document.activeElement !== ref.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const anchor = selection.anchorNode;
    if (!anchor) return;
    const anchorElement = anchor.nodeType === Node.TEXT_NODE ? (anchor.parentElement || null) : (anchor as any as Element);
    if (!anchorElement || !ref.current.contains(anchorElement)) return;

    const { cursorIndex, start, end } = getSelectionInfo(ref);
    computeAndBroadcastBulkPresence(
      dispatch,
      store.getState,
      null,
      cursorIndex,
      { start, end }
    );
  }, [dispatch]);

  const handleFocus = useCallback(() => {
    isFocusedRef.current = true;
    broadcastCurrentPresence();
  }, [broadcastCurrentPresence]);

  const handleBlur = useCallback(() => {
    isFocusedRef.current = false;
    suppressSelectionBroadcastFor(300);
    dispatch(removePresenceAndBroadcast());
  }, [dispatch, suppressSelectionBroadcastFor]);

  useEffect(() => {
    const onSelectionChange = () => {
      if (suppressSelectionBroadcastRef.current) return;
      if (!isFocusedRef.current) return;
      broadcastCurrentPresence();
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [broadcastCurrentPresence]);

  useEffect(() => {
    return () => {
      if (suppressSelectionTimeoutRef.current !== undefined) {
        window.clearTimeout(suppressSelectionTimeoutRef.current);
      }
      // On unmount, remove my presence and broadcast
      dispatch(removePresenceAndBroadcast());
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        className="border border-gray-300 rounded p-2 focus:outline-none whitespace-pre-wrap break-words"
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        // onBlur={handleBlur}
      />

      {/* Remote cursors overlay */}
      <div className="pointer-events-none absolute inset-0">
        {highlights.map(h => (
          <div key={h.sessionId + "-hl"} className="absolute">
            {h.rects.map((r, idx) => (
              <div
                key={idx}
                className="absolute rounded-sm"
                style={{
                  top: r.top,
                  left: r.left,
                  width: r.width,
                  height: r.height,
                  backgroundColor: hslToTransparent(h.color, 0.28),
                }}
              />
            ))}
          </div>
        ))}
        {overlays.map(o => (
          <div key={o.sessionId} className="absolute" style={{ top: o.top, left: o.left }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '2px',
              height: `${o.height}px`,
              backgroundColor: o.color,
              borderRadius: '1px'
            }} />
            <div style={{
              position: 'absolute',
              top: -22,
              left: 0,
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: o.labelBg,
              color: '#fff',
              border: `1px solid ${o.border}`,
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
              fontWeight: 600
            }}>
              {o.name || 'Guest'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function updateCursorPosition(cursorIndex: number, ref: React.RefObject<HTMLDivElement | null>) {
  if (ref.current) {
    const selection = window.getSelection();
    const range = document.createRange();
    const textNode = ensureTextNode(ref.current);
    const maxIndex = textNode.textContent?.length || 0;
    const safeIndex = Math.max(0, Math.min(cursorIndex, maxIndex));
    
    range.setStart(textNode, safeIndex);
    range.setEnd(textNode, safeIndex);
    
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
}



  // Get selection info: collapsed caret index, range start and end
  function getSelectionInfo(ref: React.RefObject<HTMLDivElement | null>): { cursorIndex: number; start: number; end: number } {
    if (!ref.current) return { cursorIndex: 0, start: 0, end: 0 };
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return { cursorIndex: 0, start: 0, end: 0 };
    const range = selection.getRangeAt(0);

    const preStart = range.cloneRange();
    preStart.selectNodeContents(ref.current);
    preStart.setEnd(range.startContainer, range.startOffset);
    const start = preStart.toString().length;

    const preEnd = range.cloneRange();
    preEnd.selectNodeContents(ref.current);
    preEnd.setEnd(range.endContainer, range.endOffset);
    const end = preEnd.toString().length;

    const cursorIndex = end;
    return { cursorIndex, start: Math.min(start, end), end: Math.max(start, end) };
  }


  // Get current cursor position
  const getCursorPosition = (ref: React.RefObject<HTMLDivElement | null>): number => {
    if (!ref.current) return 0;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(ref.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    
    return preCaretRange.toString().length;
  };

type Overlay = {
  sessionId: string;
  name: string;
  color: string;
  labelBg: string;
  border: string;
  top: number;
  left: number;
  height: number;
};

type Highlight = {
  sessionId: string;
  color: string;
  rects: Array<{ top: number; left: number; width: number; height: number }>;
};

type PresenceEntry = {
  sessionId: string;
  name: string;
  cursor: number;
  opStart?: number;
  opEnd?: number;
};

// Variants for caret (strong), label background (light), and border
function sessionIdToColors(id: string): { caret: string; labelBg: string; border: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  const caret = `hsl(${hue}, 60%, 50%)`;
  const labelBg = `hsl(${hue}, 55%, 35%)`;
  const border = `hsl(${hue}, 50%, 25%)`;
  return { caret, labelBg, border };
}

// Ensure the contentEditable container has a single text node child
function ensureTextNode(container: HTMLDivElement): Text {
  if (!container.firstChild || container.firstChild.nodeType !== Node.TEXT_NODE) {
    const text = container.textContent || '';
    while (container.firstChild) container.removeChild(container.firstChild);
    const tn = document.createTextNode(text);
    container.appendChild(tn);
    return tn;
  }
  return container.firstChild as Text;
}

// Get caret rectangle in viewport coordinates for a given character index
function getCaretRectAtIndex(container: HTMLDivElement, index: number): DOMRect | null {
  const textNode = ensureTextNode(container);
  const length = textNode.textContent?.length || 0;
  const safeIndex = Math.max(0, Math.min(index ?? 0, length));

  const range = document.createRange();
  try {
    range.setStart(textNode, safeIndex);
    range.setEnd(textNode, safeIndex);
  } catch (_e) {
    return null;
  }

  // Prefer precise client rects; collapsed ranges sometimes return empty rects
  const rects = range.getClientRects();
  if (rects && rects.length > 0) return rects[0];

  let rect = range.getBoundingClientRect();
  if (rect && (rect.width > 0 || rect.height > 0)) return rect;

  // Fallback: extend range by one character if possible
  if (safeIndex < length) {
    range.setEnd(textNode, safeIndex + 1);
  } else if (length > 0) {
    range.setStart(textNode, safeIndex - 1);
  }
  rect = range.getBoundingClientRect();
  return rect || null;
}

// Get rects for a character range [start, end) in viewport coordinates
function getRangeRects(container: HTMLDivElement, start: number, end: number): DOMRect[] | null {
  if (start === end) return [];
  const textNode = ensureTextNode(container);
  const length = textNode.textContent?.length || 0;
  const safeStart = Math.max(0, Math.min(start ?? 0, length));
  const safeEnd = Math.max(safeStart, Math.min(end ?? 0, length));

  const range = document.createRange();
  try {
    range.setStart(textNode, safeStart);
    range.setEnd(textNode, safeEnd);
  } catch (_e) {
    return null;
  }

  const rectList = range.getClientRects();
  const rects: DOMRect[] = [];
  for (let i = 0; i < rectList.length; i++) {
    const r = rectList[i];
    rects.push(r);
  }
  if (rects.length > 0) return rects;
  const rect = range.getBoundingClientRect();
  return rect ? [rect] : [];
}

// Convert an `hsl(h, s%, l%)` string to `hsla(h, s%, l%, a)` with given alpha
function hslToTransparent(hsl: string, alpha: number): string {
  // crude but effective: replace `hsl(` with `hsla(` and add `, alpha)`
  if (hsl.startsWith('hsl(')) {
    return hsl.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
  }
  return hsl;
}