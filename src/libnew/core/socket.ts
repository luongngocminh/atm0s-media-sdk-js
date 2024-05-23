import { TypedEventEmitter } from '../utils/typed-event-emitter';
import { Codecs, StreamKinds, LatencyMode, BitrateControlMode } from '../utils/types';
import { delay, getTrack } from '../utils/shared';
import pako from 'pako';
import { ReceiverTrack, SenderTrack } from './tracks';
import { getLogger } from '../utils/logger';
import type { IMediaGatewayConnector } from '../interfaces/gateway';
import { type IRealtimeSocketCallbacks, type RealtimeSocketOptions, RealtimeSocketState } from '../interfaces/rtsocket';
import type { ISessionConfig } from '../interfaces/session';
import type { SenderOptions } from '../interfaces/sender';
import { configPeerLatencyMode } from '../utils/latency-mode';
import { selectFromUrls } from '../utils/http';
import { HttpGatewayConnector } from './gateway';

export class RealtimeSocket extends TypedEventEmitter<IRealtimeSocketCallbacks> {
  private logger = getLogger('atm0s:realtime-socket');
  private _pcState: RealtimeSocketState = RealtimeSocketState.Created;
  private _dcState: RealtimeSocketState = RealtimeSocketState.Created;
  private _pc: RTCPeerConnection;
  private _dc: RTCDataChannel;
  private _connector: IMediaGatewayConnector;
  private _sendStreams = new Map<string, SenderTrack>();
  private _recvStreams = new Map<string, ReceiverTrack>();

  private _msg_encoder = new TextEncoder();
  private _connected = false;

  private _nodeId: number | undefined;
  private _connId: string | undefined;

  constructor(
    private _urls: string | string[],
    private _options?: RealtimeSocketOptions,
  ) {
    super();
    const peerConfig: RTCConfiguration = {
      iceServers: this._options?.iceServers || [],
    };
    configPeerLatencyMode(peerConfig, this._options?.latencyMode);
    this._pc = new RTCPeerConnection(peerConfig);
    this._connector = new HttpGatewayConnector();
    this._dc = this._pc.createDataChannel('data', {
      ordered: false,
      maxPacketLifeTime: 10000,
    });

    this._pc.ontrack = (event: RTCTrackEvent) => {
      if (event.streams.length === 0) {
        this.logger.log('connect :: no stream found');
        return;
      }
      const stream = event.streams[0]!;
      const track = event.track;

      this.logger.log('connect :: received track:', track, stream);

      const recvStream = this._recvStreams.get(stream.id);
      if (recvStream && !recvStream.hasTrack && recvStream.kind === track.kind) {
        recvStream.addTrack(track);
      }
    };

    this._pc.onconnectionstatechange = () => {
      this.logger.log('connection state changed:', this._pc.connectionState);
      switch (this._pc.connectionState) {
        case 'connected':
          this.setConnState(RealtimeSocketState.Connected);
          break;
        case 'disconnected':
          this.setConnState(RealtimeSocketState.Disconnected);
          break;
        case 'failed':
          this.setConnState(RealtimeSocketState.Failed);
          throw new Error('Peer Connection failed');
        case 'closed':
          this.setConnState(RealtimeSocketState.Closed);
          break;
      }
    };

    this._pc.oniceconnectionstatechange = () => {
      this.logger.log('ice connection state changed:', this._pc.iceConnectionState);
      switch (this._pc.iceConnectionState) {
        case 'connected':
          if (this._connected) {
            this.setConnState(RealtimeSocketState.Reconnected);
          }
          break;
        case 'disconnected':
          this.setConnState(RealtimeSocketState.Reconnecting);
          // TODO: Restart ICE
          // this.reconnect();
          break;
      }
    };

    this._dc.onmessage = (event) => {
      this.emit('message', event.data);
    };
    this._dc.onopen = () => {
      this.setDcState(RealtimeSocketState.Connected);
      this._connected = true;
      this.logger.log('datachannel connect :: opended');
    };
    this._dc.onerror = (err) => {
      this.setDcState(RealtimeSocketState.Failed);
      this.logger.error('datachannel connect :: error:', err);
    };
    this._dc.onclose = () => {
      this.setDcState(RealtimeSocketState.Closed);
      this.logger.log('datachannel connect :: closed');
    };
  }

  public async connect(config: ISessionConfig) {
    this.logger.log('connect :: connecting to %s', this._urls);
    this._pcState = RealtimeSocketState.Connecting;

    const serverUrl = await selectFromUrls(this._urls);
    this.logger.log('connect :: try connect to media server:', serverUrl);

    const offer = await this._pc.createOffer({
      offerToReceiveAudio: this._countReceiver(StreamKinds.AUDIO) > 0,
      offerToReceiveVideo: this._countReceiver(StreamKinds.VIDEO) > 0,
    });
    this.logger.log('connect :: transceivers:', this._pc.getTransceivers());
    this.logger.debug('connect :: created offer:', offer.sdp);

    const res = await this._connector.connect(serverUrl, {
      room: config.roomId,
      peer: config.peerId,
      token: config.token,
      sdp: offer.sdp!,
      tracks: {
        senders: this.getActiveSendTracks().map((s) => ({
          kind: s.kind,
          id: s.uuid,
          source: s.source?.id
            ? {
                id: s.source.id,
                screen: s.screen,
              }
            : undefined,
        })),

        receivers: Array.from(this._recvStreams.values()).map((r) => ({
          kind: r.kind,
          id: r.uuid,
        })),
      },
      event: config.event || {
        publish: 'full',
        subscribe: 'full',
      },
      bitrate: config.bitrate || {
        ingress: BitrateControlMode.Max,
      },
      features: {
        // TODO: MixMinus
      },
    });
    if (!res.status) {
      this.logger.error('connect :: failed to connect:', res);
      throw new Error(res.error);
    }
    const connId = res.data.conn_id;
    this._connId = connId;
    const sdp = res.data.sdp;

    this.logger.debug('connect :: connId:', connId);
    this.logger.debug('connect :: received answer:', sdp);
    this._pc.onicecandidate = async (_ice) => {
      // TODO: Check this back with the rfcs
      // if (ice && ice.candidate) this._connector.iceCandidate(serverUrl, nodeId, connId, ice);
    };
    this._pc.setLocalDescription(offer);
    this._pc.setRemoteDescription(new RTCSessionDescription({ sdp, type: 'answer' }));
  }

  private getActiveSendTracks() {
    return Array.from(this._sendStreams.values());
  }

  private setConnState(state: RealtimeSocketState) {
    this._pcState = state;
    this.emit('peer_state', this._pcState);
  }

  private setDcState(state: RealtimeSocketState) {
    this.logger.log('setDcState :: state:', state);
    this._dcState = state;
    this.emit('dc_state', this._dcState);
  }

  public async reconnect() {
    const serverUrl = await selectFromUrls(this._urls);
    const offer = await this._pc.createOffer({
      iceRestart: true,
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    this.logger.log('reconnect :: try reconnect to media server:', serverUrl);

    let tries = 0;
    // TODO: Make this configurable
    const maxTries = 20;

    while (tries++ < maxTries && this._connected) {
      try {
        const res = await this._connector.restartIce(serverUrl, this._nodeId!, this._connId!, offer.sdp!);
        if (!res.status) {
          throw new Error(res.error);
        }
        this.logger.debug('reconnect :: received answer:', res);

        const sdp = res.data.sdp;

        this._pc.setLocalDescription(offer);
        this._pc.setRemoteDescription(new RTCSessionDescription({ sdp, type: 'answer' }));

        if (this._pc.iceConnectionState === 'connected') {
          this.setConnState(RealtimeSocketState.Reconnected);
        }
      } catch (err) {
        this.logger.error('reconnect :: failed to reconnect:', err);
        await delay(2000);
      }
    }
    throw new Error('Failed to reconnect');
  }

  public createReceiverTrack(
    kind: StreamKinds,
    opts?: {
      codecs?: Codecs[];
      latencyMode?: LatencyMode;
    },
  ): ReceiverTrack {
    this.logger.log('createReceiverTrack :: (kind):', kind);
    const transceiver = this._pc.addTransceiver(kind, {
      direction: 'recvonly',
    });
    this.logger.debug('createReceiverTrack :: transceiver:', transceiver);
    const track = new ReceiverTrack(kind, transceiver, {
      codecs: opts?.codecs,
      latencyMode: opts?.latencyMode,
    });
    track.on('stopped', () => {
      this.onReceiverTrackStopped(track);
    });
    this._recvStreams.set(track.uuid, track);
    return track;
  }

  public createSenderTrack(kind: StreamKinds, cfg: SenderOptions): SenderTrack {
    this.logger.log('createSenderTrack :: cfg:', cfg);
    const stream = cfg.stream || new MediaStream();
    const track = getTrack(stream, kind);
    const label = track?.label || 'not-supported';

    const transceiver = this._pc.addTransceiver(track || kind, {
      direction: 'sendonly',
      streams: [stream],
      sendEncodings: cfg.maxBitrate ? [{ maxBitrate: cfg.maxBitrate }] : undefined,
    });
    const senderTrack = new SenderTrack(kind, transceiver, { ...cfg, stream, label });
    senderTrack.on('stopped', () => {
      this.onSenderTrackStopped(senderTrack);
    });
    this._sendStreams.set(senderTrack.uuid, senderTrack);
    return senderTrack;
  }

  private onReceiverTrackStopped = (track: ReceiverTrack) => {
    this.logger.log('removeReceiverTrack :: uuid:', track.uuid);
    if (track) {
      this._recvStreams.delete(track.uuid);
    }
  };

  private onSenderTrackStopped = (track: SenderTrack) => {
    this.logger.log('removeSenderTrack :: uuid:', track.uuid);
    if (track) {
      if (track.transceiver) {
        this._pc.removeTrack(track.transceiver.sender);
      }
      this._sendStreams.delete(track.uuid);
    }
  };

  public async generateOffer() {
    const offer = await this._pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    return offer;
  }

  public updateSdp(localOffer: RTCSessionDescriptionInit, remoteAnswerSdp: string) {
    this.logger.debug('updateSdp :: local offer:', localOffer.sdp);
    this.logger.debug('updateSdp :: remote answer sdp:', remoteAnswerSdp);
    this._pc.setLocalDescription(localOffer);
    this._pc.setRemoteDescription(new RTCSessionDescription({ sdp: remoteAnswerSdp, type: 'answer' }));
  }

  public send(data: string) {
    this.logger.debug('send :: data:', data);
    if (data.length < 1000) {
      this._dc?.send(data);
    } else {
      const compressed = pako.deflate(this._msg_encoder.encode(data));
      this.logger.debug('compress for sending', data.length, compressed.length);
      this._dc?.send(compressed);
    }
  }

  async close() {
    this.logger.log('close :: closing');
    this._dc?.close();
    await delay(500);
    this._pc?.close();
  }

  _countReceiver(kind: StreamKinds) {
    return Array.from(this._recvStreams.values()).filter((s) => s.kind === kind).length;
  }
}
