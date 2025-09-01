
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../app/slice";
import { undoWithPresenceUpdate, redoWithPresenceUpdate } from "../app/thunks";
import type { AppDispatch, RootState } from "../app/store";
import Block from "./Edit";

export default function Editor() {
  const dispatch = useDispatch<AppDispatch>();
  const { undo: undoStack, redo: redoStack } = useSelector((state: RootState) => state.history);
  const { name, email } = useSelector((state: RootState) => state.auth);



  const handleUndo = () => {
    if (undoStack.length > 0) {
      dispatch(undoWithPresenceUpdate())
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      dispatch(redoWithPresenceUpdate())
    }
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <div className="p-4 space-y-2 w-[70vw]">
      {/* Header with user info, toolbar, and logout */}
      <div className="flex items-center mb-4 p-3 bg-gray-100 rounded">
        <div className="flex-1">
          <div className="font-semibold text-gray-800">{name}</div>
          <div className="text-sm text-gray-600">{email}</div>
        </div>
        
        {/* Toolbar with undo/redo buttons */}
        <div className="flex items-center gap-1 mx-4">
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
            title="Undo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded disabled:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
            title="Redo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>
        
        <button
          onClick={handleLogout}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm transition-colors"
        >
          Logout
        </button>
      </div>
    
      <Block />
    </div>
  );
}