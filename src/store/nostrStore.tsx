// MSP 2.0 - Nostr Authentication State Management
import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { NostrAuthState, NostrUser } from '../types/nostr';
import {
  hasNostrExtension,
  waitForNostrExtension,
  getPublicKey,
  hexToNpub,
  loadStoredUser,
  saveUser,
  clearStoredUser
} from '../utils/nostr';
import { fetchNostrProfile } from '../utils/nostrSync';

// Action types
type NostrAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_HAS_EXTENSION'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: NostrUser }
  | { type: 'UPDATE_PROFILE'; payload: { displayName?: string; picture?: string; nip05?: string } }
  | { type: 'LOGOUT' }
  | { type: 'RESTORE_SESSION'; payload: NostrUser };

// Initial state
const initialState: NostrAuthState = {
  isLoggedIn: false,
  user: null,
  isLoading: true,
  error: null,
  hasExtension: false
};

// Reducer
function nostrReducer(state: NostrAuthState, action: NostrAction): NostrAuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_HAS_EXTENSION':
      return { ...state, hasExtension: action.payload };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isLoggedIn: true,
        user: action.payload,
        isLoading: false,
        error: null
      };
    case 'UPDATE_PROFILE':
      if (!state.user) return state;
      const updatedUser = {
        ...state.user,
        displayName: action.payload.displayName || state.user.displayName,
        picture: action.payload.picture || state.user.picture,
        nip05: action.payload.nip05 || state.user.nip05
      };
      saveUser(updatedUser);
      return { ...state, user: updatedUser };
    case 'LOGOUT':
      return {
        ...state,
        isLoggedIn: false,
        user: null,
        error: null
      };
    case 'RESTORE_SESSION':
      return {
        ...state,
        isLoggedIn: true,
        user: action.payload,
        isLoading: false
      };
    default:
      return state;
  }
}

// Context
interface NostrContextType {
  state: NostrAuthState;
  login: () => Promise<void>;
  logout: () => void;
}

const NostrContext = createContext<NostrContextType | undefined>(undefined);

// Provider
export function NostrProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(nostrReducer, initialState);

  // Check for extension and restore session on mount
  useEffect(() => {
    async function init() {
      // Check for stored session
      const storedUser = loadStoredUser();

      // Wait for extension to be available
      const extensionAvailable = await waitForNostrExtension(2000);
      dispatch({ type: 'SET_HAS_EXTENSION', payload: extensionAvailable });

      if (storedUser && extensionAvailable) {
        // Verify the stored session is still valid
        try {
          const currentPubkey = await getPublicKey();
          if (currentPubkey === storedUser.pubkey) {
            dispatch({ type: 'RESTORE_SESSION', payload: storedUser });

            // Refresh profile in background
            fetchNostrProfile(currentPubkey).then((profile) => {
              if (profile) {
                dispatch({
                  type: 'UPDATE_PROFILE',
                  payload: {
                    displayName: profile.display_name || profile.name,
                    picture: profile.picture,
                    nip05: profile.nip05
                  }
                });
              }
            });
          } else {
            // Different account, clear stored session
            clearStoredUser();
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        } catch {
          // Extension refused or error, clear stored session
          clearStoredUser();
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
    init();
  }, []);

  // Login function
  const login = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      if (!hasNostrExtension()) {
        throw new Error('No Nostr extension found. Please install Alby or another NIP-07 extension.');
      }

      const pubkey = await getPublicKey();
      const npub = hexToNpub(pubkey);

      const user: NostrUser = {
        pubkey,
        npub,
        displayName: undefined,
        picture: undefined,
        nip05: undefined
      };

      // Save to localStorage
      saveUser(user);

      dispatch({ type: 'LOGIN_SUCCESS', payload: user });

      // Fetch profile in background
      fetchNostrProfile(pubkey).then((profile) => {
        if (profile) {
          dispatch({
            type: 'UPDATE_PROFILE',
            payload: {
              displayName: profile.display_name || profile.name,
              picture: profile.picture,
              nip05: profile.nip05
            }
          });
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: message });
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    clearStoredUser();
    dispatch({ type: 'LOGOUT' });
  }, []);

  return (
    <NostrContext.Provider value={{ state, login, logout }}>
      {children}
    </NostrContext.Provider>
  );
}

// Hook
export function useNostr() {
  const context = useContext(NostrContext);
  if (context === undefined) {
    throw new Error('useNostr must be used within a NostrProvider');
  }
  return context;
}
