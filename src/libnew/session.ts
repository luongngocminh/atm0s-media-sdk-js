import { StreamReceiver } from './receiver';
import { StreamSender } from './sender';
import { StreamKinds } from './utils/types';
import { debounce } from 'ts-debounce';
import { TypedEventEmitter } from './utils/typed-event-emitter';
import { getLogger, setLogLevel } from './utils/logger';
import type { IRPC, RpcEvents } from './interfaces/rpc';
import { RPC } from './core/rpc';
import type { ISessionCallbacks, ISessionConfig, SessionTrackState } from './interfaces/session';
import { RemoteStream } from './remote';
import { RealtimeSocket } from './core/socket';
import type { SenderConfig } from '../lib/interfaces';
import type { StreamRemoteScalingType } from '../lib/utils';
import { Peer } from './peer';
import { StreamSenderState } from './interfaces/sender';

export class Session extends TypedEventEmitter<ISessionCallbacks> {
  peers = new Map<string, Peer>();

  private _audioSenders = new Map<string, StreamSender>();
  private _videoSenders = new Map<string, StreamSender>();

  // private _streams = new StreamMapping();

  private _audioReceivers: StreamReceiver[] = [];
  private _videoReceivers: StreamReceiver[] = [];
  private _remotes = new Map<string, RemoteStream>();

  private logger = getLogger('atm0s:session');
  private _rpc: IRPC;
  // private _mixminus?: ReceiverMixMinusAudio;

  public disconnected = false;
  public wasConnected = false;

  private _socket: RealtimeSocket;

  constructor(
    urls: string | string[],
    private _cfg: ISessionConfig,
  ) {
    super();
    if (this._cfg.logLevel) {
      this.logger.log('set log level:', this._cfg.logLevel);
      setLogLevel(this._cfg.logLevel);
    }
    this._socket = new RealtimeSocket(urls);
    this._socket.on('peer_state', (state) => {
      this.emit('peer_state', state);
      switch (state) {
        case 'failed':
        case 'closed':
          this.logger.info('peer disconnected:', state);
          this.disconnected = true;
          // this._mixminus?.releaseElements();
          this.emit('disconnected', state);
          break;
        case 'connected':
          this.wasConnected = true;
          break;
        case 'reconnected':
          this.logger.info('peer reconnected:', state);
          this.emit('reconnected', state);
          break;
        case 'reconnecting':
          this.logger.info('peer reconnecting:', state);
          this.emit('reconnecting', state);
          break;
      }
    });
    this._socket.on('dc_state', (state) => {
      this.emit('dc_state', state);
      switch (state) {
        case 'connected':
          this.emit('connected');
          if (this._cfg.mixMinusAudio) {
            // this._mixminus?.connect();
          }
          break;
        case 'disconnected':
          this.logger.info('data channel disconnected:', state);
          this.emit('disconnected', state);
          // this._socket.close();
          break;
      }
    });
    this._rpc = new RPC(this._socket);
    // if (_cfg.mixMinusAudio) {
    //   if (_cfg.receivers) {
    //     _cfg.receivers.audio = (_cfg.receivers.audio || 0) + 3;
    //   } else {
    //     _cfg.receivers = { audio: 3, video: 0 };
    //   }
    //   this._mixminus = new ReceiverMixMinusAudio('default', this, this._rpc, _cfg.mixMinusAudio.elements);
    // }
    this._rpc.on('room.tracks.added', this.onRoomTrackEvent);
    this._rpc.on('room.tracks.updated', this.onRoomTrackEvent);
    this._rpc.on('room.tracks.removed', this.onRoomTrackEvent);
    this._rpc.on('room.peers.added', this.onPeerAdded);
    this._rpc.on('room.peers.removed', this.onPeerRemoved);
    this._cfg.senders?.map((s) => {
      if (s.stream) {
        const senderTrack = this._socket.createSenderTrack(s.kind, s);
        this.logger.info('created sender track:', senderTrack);
        const sender = new StreamSender(this._rpc, senderTrack);

        if (senderTrack.kind === StreamKinds.AUDIO) {
          this._audioSenders.set(s.name, sender);
        }
        if (senderTrack.kind === StreamKinds.VIDEO) {
          this._videoSenders.set(s.name, sender);
        }
      }
    });

    if (this._cfg.receivers?.video) {
      for (let i = 0; i < this._cfg.receivers.video; i++) {
        const recvrTrack = this._socket.createReceiverTrack(StreamKinds.VIDEO);
        const receiver = new StreamReceiver(this._rpc, recvrTrack);
        this._videoReceivers.push(receiver);
      }
    }

    if (this._cfg.receivers?.audio) {
      for (let i = 0; i < this._cfg.receivers.audio; i++) {
        const recvrTrack = this._socket.createReceiverTrack(StreamKinds.AUDIO);
        const receiver = new StreamReceiver(this._rpc, recvrTrack);
        this._audioReceivers.push(receiver);
      }
    }
  }

  connect() {
    this.logger.info('start to connect ...');
    return this._socket.connect(this._cfg);
  }

  async restartIce() {
    // if (!this.wasConnected) {
    //   this.logger.warn('should call restartIce after connected');
    //   return;
    // }
    // if (this.disconnected) {
    //   this.logger.warn('should call restartIce before disconnect');
    //   return;
    // }
    // try {
    //   const rtt = await this.ping();
    //   this.logger.warn('ping success, not restart ice, ping rtt', rtt);
    // } catch (e) {
    //   return this.restartIceInternal();
    // }
  }

  // private restartIceInternal = async () => {
  //   if (!this.wasConnected) {
  //     this.logger.warn('should call restartIce after connected');
  //     return;
  //   }
  //   if (this.disconnected) {
  //     this.logger.warn('should call restartIce before disconnect');
  //     return;
  //   }
  //   this.emit('reconnecting');
  //   await this._socket.reconnect();
  // };

  // private _onSenderStopped = (sender: StreamSender) => {
  //   this.logger.info('sender stopped:', sender.name);
  //   if (sender.kind === StreamKinds.AUDIO) {
  //     this._audioSenders.delete(sender.name);
  //   }
  //   if (sender.kind === StreamKinds.VIDEO) {
  //     this._videoSenders.delete(sender.name);
  //   }
  //   if (this.wasConnected) {
  //     this.update();
  //   }
  // };

  async disconnect() {
    this.disconnected = true;
    // this._mixminus?.releaseElements();
    this._socket?.close();
  }

  // createPublisher(cfg: SenderOptions) {
  //   return new StreamPublisher(this, cfg);
  // }
  //
  // createConsumer(remote: RemoteStream) {
  //   return new StreamConsumer(this, remote);
  // }
  //
  // createConsumerPair(peerId: string, audioName: string, videoName: string) {
  //   const audioConsumer = this.createConsumer(new RemoteStream(StreamKinds.AUDIO, peerId, '', audioName));
  //   const videoConsumer = this.createConsumer(new RemoteStream(StreamKinds.VIDEO, peerId, '', videoName));
  //   return new StreamConsumerPair(videoConsumer, audioConsumer);
  // }

  createSender(cfg: SenderConfig) {
    const senderTrack = this._socket.createSenderTrack(cfg.kind, cfg);
    const sender = new StreamSender(this._rpc, senderTrack);
    // sender.on('stopped', this._onSenderStopped);
    if (cfg.kind === StreamKinds.AUDIO) {
      this._audioSenders.set(cfg.name, sender);
    }
    if (cfg.kind === StreamKinds.VIDEO) {
      this._videoSenders.set(cfg.name, sender);
    }
    if (this.wasConnected) {
      this.logger.info('create sender after connected, update sdp');
      this.update();
    }
    return sender;
  }

  createReceiver(kind: StreamKinds) {
    const recvrTrack = this._socket.createReceiverTrack(kind);
    const receiver = new StreamReceiver(this._rpc, recvrTrack);
    if (kind === StreamKinds.AUDIO) {
      this._audioReceivers.push(receiver);
    }
    if (kind === StreamKinds.VIDEO) {
      this._videoReceivers.push(receiver);
    }
    if (this.wasConnected) {
      this.logger.info('create receiver after connected, update sdp');
      this.update();
    }
    return receiver;
  }

  takeReceiver(kind: StreamKinds): StreamReceiver {
    switch (kind) {
      case StreamKinds.AUDIO:
        if (this._audioReceivers.length === 0) {
          this.createReceiver(kind);
        }
        return this._audioReceivers.shift()!;
      case StreamKinds.VIDEO:
        if (this._videoReceivers.length === 0) {
          this.createReceiver(kind);
        }
        return this._videoReceivers.shift()!;
      default:
        throw new Error('Invalid stream kind');
    }
  }

  // getMixMinusAudio(): ReceiverMixMinusAudio | undefined {
  //   return this._mixminus;
  // }
  //
  backReceiver(receiver: StreamReceiver) {
    if (receiver.kind === StreamKinds.AUDIO) {
      this._audioReceivers.push(receiver);
    }
    if (receiver.kind === StreamKinds.VIDEO) {
      this._videoReceivers.push(receiver);
    }
  }

  getSender(kind: StreamKinds, name: string) {
    switch (kind) {
      case StreamKinds.AUDIO:
        return this._audioSenders.get(name);
      case StreamKinds.VIDEO:
        return this._videoSenders.get(name);
      default:
        return undefined;
    }
  }

  private update = debounce(this.updateSdp, 500, {
    isImmediate: false,
  });

  private getCurrentTrackState(): SessionTrackState {
    const result: SessionTrackState = {
      receivers: this._audioReceivers.concat(this._videoReceivers).map((r) => {
        let peerId = r.trackId ? this._remotes.get(r.trackId!)?.peerId : undefined;
        return {
          kind: r.kind,
          id: r.id,
          state: r.trackId
            ? {
                source: {
                  peer_id: peerId!,
                  track_id: r.trackId!,
                },
                limit: {
                  priority: r.limitState.priority,
                  min_spatial: r.limitState?.minSpatial,
                  min_temporal: r.limitState?.minTemporal,
                  max_spatial: r.limitState.maxSpatial,
                  max_temporal: r.limitState.maxTemporal,
                },
              }
            : undefined,
        };
      }),

      senders: Array.from(this._audioSenders.values())
        .concat(Array.from(this._videoSenders.values()))
        .map((s) => {
          return {
            kind: s.kind,
            id: s.id,
            state: {
              active: s.state === StreamSenderState.Active,
            },
            source: s.trackId
              ? {
                  id: s.trackId,
                  screen: s.isScreen,
                }
              : undefined,
          };
        }),
    };

    return result;
  }

  private async updateSdp() {
    this.logger.info('will update sdp now');
    const offer = await this._socket.generateOffer();
    const tracks = this.getCurrentTrackState();
    const res = await this._rpc!.request('session.update_sdp', { sdp: offer.sdp!, tracks });
    if (!res.status) {
      this.logger.error('updateSdp :: Error response from server', res);
      throw new Error('SERVER_ERROR');
    }
    this.logger.debug('updateSdp :: received answer:', res.data);
    this._socket.updateSdp(offer, res.data.sdp);
  }

  private onRoomTrackEvent = (
    event: keyof RpcEvents,
    params: {
      kind: StreamKinds;
      peer_id: string;
      track_id: string;
      source?: {
        id: string;
        screen: boolean;
      };
      metadata?: string;
      state?: {
        active: boolean;
        scaling?: StreamRemoteScalingType;
      };
    },
  ) => {
    this.logger.info('on stream event:', event, params);
    const key = params.track_id;
    const isMyStream = params.peer_id === this._cfg.peerId;

    switch (event) {
      case 'room.tracks.added':
      case 'room.tracks.updated':
        if (this._remotes.has(key)) {
          const remote = this._remotes.get(key)!;
          remote.updateState(params.state!);
          this.emit(isMyStream ? 'local_stream.updated' : 'stream.updated', remote);
          if (this.peers.has(params.peer_id)) {
            this.peers.get(params.peer_id)!.updateRemote(remote);
          }
        } else {
          const remote = new RemoteStream(params.kind, params.source!.id, params.peer_id, params.track_id);
          // this._streams.add(params.peer_hash, params.source?.id, remote);
          remote.updateState(params.state!);
          if (this.peers.has(params.peer_id)) {
            this.peers.get(params.peer_id)!.updateRemote(remote);
          }
          this._remotes.set(key, remote);
          this.emit(isMyStream ? 'local_stream.added' : 'stream.added', remote);
        }

        break;
      case 'room.tracks.removed':
        if (this._remotes.has(key)) {
          const remote = this._remotes.get(key)!;
          // this._streams.remove(params.peer_hash, params.stream);
          this._remotes.delete(key);
          if (this.peers.has(params.peer_id)) {
            this.peers.get(params.peer_id)!.removeRemote(params.track_id);
          }
          this.emit(isMyStream ? 'local_stream.removed' : 'stream.removed', remote);
        }
        break;
    }
  };

  private onPeerAdded = (event: keyof RpcEvents, params: { peer_id: string; metadata?: string }) => {
    this.logger.info('peer added:', event, params);
    if (!this.peers.has(params.peer_id)) {
      const peer = new Peer(params.peer_id, params.metadata);
      this.peers.set(params.peer_id, peer);
      this.emit('peer.added', peer);
    }
  };

  private onPeerRemoved = (event: keyof RpcEvents, params: { peer_id: string }) => {
    this.logger.info('peer removed:', event, params);
    if (this.peers.has(params.peer_id)) {
      const peer = this.peers.get(params.peer_id)!;
      this.peers.delete(params.peer_id);
      this.emit('peer.removed', peer);
    }
  };
}
