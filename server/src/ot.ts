import type { Operation } from "./types";

/**
 * Apply an operation to document content
 * This function handles the core logic for applying insert, delete, and replace operations
 */
// export function applyOperation(content: string, op: Operation): string {
//   const { kind, index, text, length, prevText, invert } = op;

//   // Validate operation
//   if (index < 0 || index > content.length) {
//     throw new Error(`Invalid operation index: ${index}`);
//   }

//   switch (kind) {
//     case "insert":
//       if (!text) {
//         throw new Error("Insert operation requires text");
//       }
//       return invert
//         ? content.slice(0, index) + content.slice(index + text.length) // undo insert
//         : content.slice(0, index) + text + content.slice(index);       // normal insert

//     case "delete":
//       if (!length || length <= 0) {
//         throw new Error("Delete operation requires positive length");
//       }
//       if (index + length > content.length) {
//         throw new Error("Delete operation exceeds content boundaries");
//       }
//       return invert
//         ? content.slice(0, index) + (prevText || "") + content.slice(index)   // undo delete
//         : content.slice(0, index) + content.slice(index + length);     // normal delete

//     case "replace":
//       if (!length || length <= 0) {
//         throw new Error("Replace operation requires positive length");
//       }
//       if (!text) {
//         throw new Error("Replace operation requires text");
//       }
//       if (index + length > content.length) {
//         throw new Error("Replace operation exceeds content boundaries");
//       }
//       return invert
//         ? content.slice(0, index) + (prevText || "") + content.slice(index + text.length) // undo replace
//         : content.slice(0, index) + text + content.slice(index + length);         // normal replace

//     default:
//       throw new Error(`Unknown operation kind: ${(op as any).kind}`);
//   }
// }
export const applyOperation = (content: string, op: Operation): string => {

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
/**
 * Transform an operation based on another operation that was applied first
 * This is a simplified version - in a production system, you'd want more sophisticated OT
 */
export function transformOperation(op: Operation, appliedOp: Operation): Operation {
  // If operations are on the same document and user, no transformation needed
  if (op.docId === appliedOp.docId && op.userId === appliedOp.userId) {
    return op;
  }

  // For now, return the operation as-is
  // In a real implementation, you'd want to transform the operation based on
  // how the applied operation affects the document content
  return { ...op };
}

/**
 * Check if two operations conflict
 */
export function hasConflict(op1: Operation, op2: Operation): boolean {
  // Operations conflict if they modify overlapping ranges
  if (op1.kind === "insert" && op2.kind === "insert") {
    // Insert operations at the same index conflict
    return op1.index === op2.index;
  }

  if (op1.kind === "delete" && op2.kind === "delete") {
    // Delete operations with overlapping ranges conflict
    const op1End = op1.index + (op1.length || 0);
    const op2End = op2.index + (op2.length || 0);
    return !(op1End <= op2.index || op2End <= op1.index);
  }

  // Other combinations may conflict depending on the specific implementation
  return false;
}
