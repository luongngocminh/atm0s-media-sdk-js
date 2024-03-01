import type { RemoteStream } from './remote';
import { TypedEventEmitter } from './utils';

export interface IPeerCallbacks {
  'stream.updated': (remote: RemoteStream) => void;
  'stream.removed': (id: string) => void;
}

export interface IPeerInfo {
  id: string;
  metadata?: string;
}

export class Peer extends TypedEventEmitter<IPeerCallbacks> {
  private _remotes = new Map<string, RemoteStream>();

  constructor(
    public readonly id: string,
    public metadata?: string,
  ) {
    super();
  }

  updateRemote(remote: RemoteStream) {
    this._remotes.set(remote.trackId, remote);
    this.emit('stream.updated', remote);
  }

  removeRemote(trackId: string) {
    if (this._remotes.delete(trackId)) {
      this.emit('stream.removed', trackId);
    }
  }
}
