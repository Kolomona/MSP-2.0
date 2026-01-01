// NIP-07 Browser Extension API Types
// Specification: https://github.com/nostr-protocol/nips/blob/master/07.md

export interface NostrEvent {
  id?: string;
  pubkey?: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig?: string;
}

export interface NostrRelays {
  [url: string]: { read: boolean; write: boolean };
}

// NIP-07 window.nostr interface
export interface Nip07Extension {
  getPublicKey(): Promise<string>;
  signEvent(event: NostrEvent): Promise<NostrEvent>;
  getRelays?(): Promise<NostrRelays>;
  nip04?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
  nip44?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
}

// Extend the Window interface
declare global {
  interface Window {
    nostr?: Nip07Extension;
  }
}

// User profile state
export interface NostrUser {
  pubkey: string;       // hex pubkey
  npub: string;         // bech32 npub
  displayName?: string; // from profile metadata (kind 0)
  picture?: string;     // profile picture URL
  nip05?: string;       // NIP-05 identifier
}

// Auth state
export interface NostrAuthState {
  isLoggedIn: boolean;
  user: NostrUser | null;
  isLoading: boolean;
  error: string | null;
  hasExtension: boolean;
}

// Saved album info from Nostr
export interface SavedAlbumInfo {
  id: string;           // event id
  dTag: string;         // d tag (album guid)
  title: string;        // album title
  createdAt: number;    // timestamp
  pubkey: string;       // author pubkey
}
