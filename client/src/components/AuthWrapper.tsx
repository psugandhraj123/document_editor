import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../app/store';
import { setUser, setAuthLoading, setAuthError, clearAuthError } from '../app/slice';
import { validateStoredAuth } from '../lib/auth';
import Login from './Login';
import Register from './Register';

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, loading, error } = useSelector((state: RootState) => state.auth);
  const [showLogin, setShowLogin] = useState(true);

  useEffect(() => {
    const validateAuth = async () => {
      const token = localStorage.getItem('authToken');
      
      if (token && !isAuthenticated) {
        dispatch(setAuthLoading(true));
        dispatch(clearAuthError());
        
        try {
          const { isValid, user } = await validateStoredAuth();
          
          if (isValid && user) {
            dispatch(setUser({
              userId: user.id,
              name: user.name,
              email: user.email,
              token: token
            }));
          } else {
            // Token is invalid, clear loading state
            dispatch(setAuthLoading(false));
          }
        } catch (error) {
          dispatch(setAuthError('Failed to validate authentication'));
          dispatch(setAuthLoading(false));
        }
      }
    };

    validateAuth();
  }, [dispatch, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center w-[100vw] bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className='w-[100vw]'>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        {showLogin ? (
          <Login onSwitchToRegister={() => setShowLogin(false)} />
        ) : (
          <Register onSwitchToLogin={() => setShowLogin(true)} />
        )}
      </div>
    );
  }

  return <>{children}</>;
}
