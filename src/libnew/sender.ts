import type { SenderTrack } from './core/tracks';
import type { IRPC } from './interfaces/rpc';
import { type IStreamSenderCallbacks, StreamSenderState } from './interfaces/sender';
import { getLogger } from './utils/logger';
import { TypedEventEmitter } from './utils/typed-event-emitter';

export class StreamSender extends TypedEventEmitter<IStreamSenderCallbacks> {
  get id() {
    return this._track.uuid;
  }

  get trackId() {
    return this._track.trackId;
  }

  get state() {
    return this._state;
  }

  get simulcast() {
    return this._track.simulcast;
  }

  get maxBitrate() {
    return this._track.maxBitrate;
  }

  get isScreen() {
    return this._track.screen;
  }

  get uuid() {
    return this._track.uuid;
  }

  get label() {
    return this._track.label;
  }

  get stream() {
    return this._track.stream;
  }

  get kind() {
    return this._track.kind;
  }

  private _state: StreamSenderState = StreamSenderState.Created;
  private logger = getLogger('atm0s:stream-sender');
  constructor(
    private _rpc: IRPC,
    private _track: SenderTrack,
    public metadata?: string,
  ) {
    super();
    this._rpc.on('session.senders.state', this._handleStateChange);
  }

  private _handleStateChange = (_: string, { id, state }: { id: string; state: StreamSenderState }) => {
    if (id !== this.id) {
      return;
    }
    this._setState(state);
  };

  private _setState(state: StreamSenderState) {
    this._state = state;
    this.emit('state', state);
  }

  switch(stream: MediaStream | null, label?: string) {
    this.logger.debug('switch stream', stream);
    this._track.replaceStream(stream, label);
    this._rpc.request('session.senders.switch', {
      id: this.id,
      source: stream
        ? {
            id: this._track.trackId!,
            screen: this.isScreen,
          }
        : undefined,
    });
  }

  toggle(active: boolean) {
    this.logger.debug('toggle', active);
    this._rpc.request('session.senders.toggle', {
      id: this.id,
      active,
    });
  }

  async stop() {
    if (this._state === StreamSenderState.NoSource) {
      return;
    }
    this._rpc.request('session.senders.switch', {
      id: this.id,
      source: undefined,
    });
    this._track.stop();
    this._rpc.off(`session.senders.state`, this._handleStateChange);
    this._setState(StreamSenderState.NoSource);
    this.emit('stopped');
  }
}
