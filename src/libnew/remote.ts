import { TypedEventEmitter } from './utils/typed-event-emitter';
import { StreamRemoteScalingType, type StreamKinds  } from './utils/types';

export interface IStreamRemoteCallbacks {
  state: (state: StreamRemoteState) => void;
  closed: () => void;
}

export interface StreamRemoteState {
  scaling?: StreamRemoteScalingType | null;
  active: boolean;
}

export class RemoteStream extends TypedEventEmitter<IStreamRemoteCallbacks> {
  _state: StreamRemoteState = {
    scaling: null,
    active: true,
  };

  constructor(
    public readonly kind: StreamKinds,
    public readonly remoteId: string,
    public readonly peerId: string,
    public readonly trackId: string,
  ) {
    super();
  }

  get state() {
    return this._state;
  }

  updateState(_state: StreamRemoteState) {
    if (JSON.stringify(this._state) !== JSON.stringify(_state)) {
      this._state = _state;
      this.emit('state', _state);
    }
  }

  close() {
    this.emit('closed');
  }
}
