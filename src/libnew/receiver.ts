import type { IRPC } from './interfaces/rpc';
import type { ReceiverTrack } from './core/tracks';
import { Codecs, getLogger, type AnyFunction, TypedEventEmitter, type StreamLimit } from './utils';
import { StreamReceiverState, type IStreamReceiverCallbacks, type ReceiverStats } from './interfaces/receiver';
import type { RemoteStream } from './remote';

interface ReceiverStateSource {
  scaling?: 'simulcast' | 'svc' | undefined;
  spatial: number;
  temporal: number;
  codec: Codecs;
}

export class StreamReceiver extends TypedEventEmitter<IStreamReceiverCallbacks> {
  readyPromises: AnyFunction[] = [];
  limitState: StreamLimit = {
    priority: 50,
    maxSpatial: 2,
    maxTemporal: 2,
  };
  private _state: StreamReceiverState = StreamReceiverState.NoSource;
  private logger = getLogger('atm0s:stream-receiver');

  get state() {
    return this._state;
  }

  get stream() {
    return this._track.stream;
  }

  get kind() {
    return this._track.kind;
  }

  get id() {
    return this._track.uuid;
  }

  get trackId() {
    return this._track.trackId;
  }

  private _source: ReceiverStateSource | undefined;

  get source() {
    return this._source;
  }

  constructor(
    private _rpc: IRPC,
    private _track: ReceiverTrack,
  ) {
    super();
    this.logger.log('id', this.id);
    this._rpc.on('session.receivers.state', this._handleStateChange);
    this._rpc.on('session.receivers.stats', this._handleStats);
    this._rpc.on('rpc.connected', this._ready);
    this._track.on('track_added', this._handleOnTrackAdded);
  }

  private _ready = () => {
    this.readyPromises.forEach((resolve) => resolve(true));
    this.readyPromises = [];
  };

  private _handleOnTrackAdded = (track: MediaStreamTrack) => {
    this.logger.log('track added', this._track.stream);
    this.emit('track_added', track);
    if (this._rpc.connected) this._ready();
  };

  private _handleStats = (_: string, event: ReceiverStats & { id: string }) => {
    if (event.id !== this.id) return;

    this.emit('stats', event);
  };

  private _handleStateChange = (
    _: string,
    { id, state, source }: { id: string; state: StreamReceiverState; source?: ReceiverStateSource },
  ) => {
    if (id !== this.id) return;

    this._setState(state);
    this._source = source;

    this.logger.log('on receiver state', state, source);
    switch (state) {
      case StreamReceiverState.Live:
        if (
          [StreamReceiverState.Waiting, StreamReceiverState.Inactive, StreamReceiverState.KeyOnly].includes(this._state)
        ) {
          this._setState(StreamReceiverState.Live);
        }
        break;
      case StreamReceiverState.KeyOnly:
        if (
          [StreamReceiverState.Inactive, StreamReceiverState.KeyOnly, StreamReceiverState.Live].includes(this._state)
        ) {
          this._setState(StreamReceiverState.KeyOnly);
        }
        break;
      case StreamReceiverState.Inactive:
        if (
          [StreamReceiverState.Live, StreamReceiverState.KeyOnly, StreamReceiverState.Waiting].includes(this._state)
        ) {
          this._setState(StreamReceiverState.Inactive);
        }
        break;
    }
  };

  private _setState(state: StreamReceiverState) {
    this._state = state;
    this.emit('state', state);
  }

  private async internalReady() {
    if (this._rpc?.connected) return true;
    return new Promise((resolve) => {
      this.readyPromises.push(resolve); //this ensure checking order
    });
  }

  async switch(remote: RemoteStream, priority: number = 50) {
    this.logger.log('switch stream', remote.trackId, remote.peerId, this.id);
    await this.internalReady();
    if (this._track.stream) {
      this._setState(StreamReceiverState.Waiting);
      const res = await this._rpc.request('session.receivers.switch', {
        id: this.id,
        priority,
        source: { peer_id: remote.peerId, track_id: remote.trackId },
      });
      this.logger.info('switch stream response', res);
      if (res.status === true) {
        return true;
      } else {
        this._setState(StreamReceiverState.NoSource);
        return false;
      }
    }
    return false;
  }

  async limit(limit: StreamLimit): Promise<boolean> {
    this.logger.log('limit stream', limit.priority, limit.maxSpatial, limit.maxTemporal);
    await this.internalReady();
    if (this._track.stream) {
      const res = await this._rpc.request('session.receivers.limit', {
        id: this.id,
        priority: limit.priority,
        min_spatial: limit.minSpatial,
        min_temporal: limit.minTemporal,
        max_spatial: limit.maxSpatial,
        max_temporal: limit.maxTemporal,
      });
      if (res.status === true) {
        this.limitState = limit;
        return true;
      } else {
        return false;
      }
    }
    return false;
  }

  // async disconnect() {
  //   if (this._state === StreamReceiverState.NoSource) {
  //     return true;
  //   }
  //   const res = await this._rpc.request('receiver.disconnect', {
  //     id: this.id,
  //   });
  //   if (res.status === false) {
  //     return false;
  //   }
  //   this._setState(StreamReceiverState.NoSource);
  //   this.emit('disconnected');
  //   return true;
  // }
}
