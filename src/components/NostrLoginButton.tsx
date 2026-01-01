import { useNostr } from '../store/nostrStore';
import { truncateNpub } from '../utils/nostr';

export function NostrLoginButton() {
  const { state, login, logout } = useNostr();
  const { isLoggedIn, user, isLoading, error, hasExtension } = state;

  // Loading state
  if (isLoading) {
    return (
      <button className="btn btn-secondary btn-small" disabled>
        ...
      </button>
    );
  }

  // Logged in state - show user info and logout
  if (isLoggedIn && user) {
    return (
      <div className="nostr-user-info">
        {user.picture && (
          <img
            src={user.picture}
            alt=""
            className="nostr-avatar"
          />
        )}
        <span className="nostr-npub" title={user.npub}>
          {user.displayName || truncateNpub(user.npub)}
        </span>
        <button
          className="btn btn-secondary btn-small"
          onClick={logout}
          title="Sign out"
        >
          Sign Out
        </button>
      </div>
    );
  }

  // Not logged in - show login button
  return (
    <div className="nostr-login-wrapper">
      <button
        className="btn btn-secondary btn-small"
        onClick={login}
        disabled={!hasExtension}
        title={hasExtension ? 'Sign in with Nostr' : 'Nostr extension not found'}
      >
        {hasExtension ? 'Sign in' : 'No Extension'}
      </button>
      {error && (
        <span className="nostr-error" title={error}>!</span>
      )}
    </div>
  );
}
