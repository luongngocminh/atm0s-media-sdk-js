import { RemoteStream } from '../remote';
import { StreamKinds, TypedEventEmitter } from '../utils';

export interface IPeerCallbacks {
  'track.added': (track: IPeerTrack) => void;
}

export interface IPeerTrack {
  kind: StreamKinds;
  track_id: string;
  peer_id: string;
  metadata?: string;
  source?: {
    id: string;
    screen: boolean;
  };
  state?: {
    active: boolean;
    scaling?: 'simulcast' | 'svc';
  };
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

  addRemote(remote: RemoteStream) {
    this._remotes.set(remote.trackId, remote);
  }

  removeRemote(trackId: string) {
    this._remotes.delete(trackId);
  }
}
