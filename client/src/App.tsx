import './App.css'
import Editor from './components/Editor'
import AuthWrapper from './components/AuthWrapper'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { logout, applyThirdPartyOperation, transformHistoryForThirdPartyOperation, updateUserPresence, updateUsersPresenceBulk } from './app/slice'
import { setNetworkClient, setDocumentWithHistoryClear } from './app/thunks'
import type { AppDispatch, RootState } from './app/store'
import { config } from './config/env'
import { getAuthHeaders } from './lib/auth'
import type { Operation } from './types/models';
import { NetworkClient } from './lib/network';

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { token, isAuthenticated, userId, name } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    let network: NetworkClient | null = null;
    
    if (!isAuthenticated || !token) {
      setLoading(false);
      return () => {
        // No explicit disconnectNetwork call here as it's handled by NetworkClient
      };
    }

    const fetchDocument = async () => {
      try {
        // Fetch initial document state via REST API with auth headers
        const response = await fetch(`${config.backendUrl}/api/document`, {
          headers: getAuthHeaders(token)
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication required');
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const doc = await response.json();
        
        // Update document in Redux store
        dispatch(setDocumentWithHistoryClear({
          id: doc.id,
          content: doc.content,
          version: doc.version
        }));
        // Initialize network connection to WebSocket server with token
        network = new NetworkClient(`${config.wsUrl}?token=${token}`, {
          userId: userId,
          name: name || 'Anonymous User',
          docId: doc.id,
          lastKnownVersion: doc.version
        });
        
        // Set the network client in the slice so thunk actions can use it
        setNetworkClient(network);
        
        // Connect the network
        network.connect();
        
        // Set up message handler for incoming operations and presence
        network.on("message", (envelope: any) => {
          if (envelope.type === "OP") {
            const operation: Operation = envelope.payload;
            try {
              dispatch(applyThirdPartyOperation(operation));
              dispatch(transformHistoryForThirdPartyOperation(operation));
            } catch (error) {
              console.error("Failed to apply incoming operation:", error, operation);
            }
          } else if (envelope.type === "PRESENCE") {
            // Handle presence updates (single or array)
            try {
              const payload = envelope.payload;
              if (Array.isArray(payload)) {
                dispatch(updateUsersPresenceBulk(payload));
              } else {
                dispatch(updateUserPresence(payload));
              }
            } catch (error) {
              console.error("Failed to handle presence update:", error, envelope.payload);
            }
          }
        });
        
        // Send HELLO message to establish connection
        network.sendEnvelope('HELLO', {
          userId: userId,
          name: name || 'Anonymous User',
          docId: doc.id,
          lastKnownVersion: doc.version
        });
      } catch (err) {
        console.error('Failed to fetch document:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch document');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocument();
    
    // Cleanup function - disconnect network when effect is cleaned up
    return () => {
      if (network) {
        network.close();
      }
    };
  }, [dispatch, isAuthenticated, token, userId, name]);
  
  return (
    <div className="app w-[100vw] flex items-center">
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mb-4"></div>
          <div className="text-xl font-medium text-gray-700 mb-2">Loading document...</div>
          <div className="text-sm text-gray-500">Please wait while we prepare your workspace</div>
        </div>
      )}
      
      {error && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-red-50 to-pink-100">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-4">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">Oops! Something went wrong</h2>
            <p className="text-gray-600 text-center mb-6">{error}</p>
            <div className="space-y-3">
              <button 
                onClick={() => window.location.reload()} 
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Try Again
              </button>
              <button 
                onClick={() => {
                  dispatch(logout());
                  setError(null);
                }} 
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
      
      {!loading && !error && <Editor />}
    </div>
  )
}

export default function AppWithAuth() {
  return (
    <AuthWrapper>
      <App />
    </AuthWrapper>
  );
}
