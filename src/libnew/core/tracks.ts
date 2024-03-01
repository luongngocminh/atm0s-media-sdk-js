import type { IReceiverTrackCallbacks, ISenderTrackCallbacks } from '../interfaces/tracks';
import { addTransceiverPreferredCodecs, addTransceiverSimulcast, configLatencyMode } from '../utils/transceiver';
import { getTrack } from '../utils/shared';
import { TypedEventEmitter } from '../utils/typed-event-emitter';
import { ContentHint, LatencyMode, StreamKinds } from '../utils/types';
import type { SenderOptions } from '../interfaces/sender';
import type { ReceiverConfig } from '../interfaces/receiver';

export class SenderTrack extends TypedEventEmitter<ISenderTrackCallbacks> {
  private static seed = 0;
  public uuid: string;
  public stream: MediaStream | null = null;
  private _label: string | undefined;
  public screen: boolean;
  public simulcast: boolean;
  public maxBitrate: number | undefined;
  public contentHint: ContentHint | undefined;

  public get label() {
    return this.trackId ? this._label || this.getTrack()?.label || 'unknown' : undefined;
  }
  public get active() {
    return this.stream?.active;
  }

  get trackId() {
    return this.getTrack()?.id;
  }

  constructor(
    public kind: StreamKinds,
    public transceiver: RTCRtpTransceiver,
    opts?: SenderOptions,
  ) {
    super();
    this.stream = opts?.stream || new MediaStream();
    this.uuid = `sender-${kind}-${SenderTrack.seed++}`;
    this._label = opts?.label;
    this.screen = opts?.screen || false;
    this.simulcast = opts?.simulcast || false;
    this.maxBitrate = opts?.maxBitrate;
    this.contentHint = opts?.contentHint;

    if (opts?.contentHint && this.getTrack() && opts.contentHint !== ContentHint.None) {
      this.getTrack()!.contentHint = opts.contentHint;
    }
    if (transceiver.sender && kind === StreamKinds.VIDEO) {
      if (opts?.simulcast) {
        addTransceiverSimulcast(transceiver, {
          maxBitrate: this.maxBitrate,
          isScreen: this.screen,
        });
      }
      if (opts?.preferredCodecs) {
        addTransceiverPreferredCodecs(transceiver, kind, opts.preferredCodecs);
      }
    }
  }

  replaceStream(stream: MediaStream | null, label?: string) {
    if (label && label !== this.label) {
      this._label = label;
    }
    if (this.stream && stream === this.stream) {
      return;
    }
    this.stream = stream;
    this.transceiver.sender.replaceTrack(getTrack(stream, this.kind) || null);

    if (this.contentHint && this.getTrack()) {
      this.getTrack()!.contentHint = this.contentHint;
    }
  }

  getTrack() {
    return getTrack(this.stream, this.kind);
  }

  stop() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.emit('stopped');
  }

  pause() {
    this.stream?.getTracks().forEach((track) => (track.enabled = false));
  }
}

export class ReceiverTrack extends TypedEventEmitter<IReceiverTrackCallbacks> {
  private static seed = 0;
  public uuid: string;
  public hasTrack: boolean = false;
  public stream: MediaStream;
  get trackId() {
    return this.getTrack()?.id;
  }
  constructor(
    public kind: StreamKinds,
    public transceiver: RTCRtpTransceiver,
    opts?: ReceiverConfig,
  ) {
    super();
    this.stream = new MediaStream();
    this.uuid = `receiver-${this.kind}-${ReceiverTrack.seed++}`;
    if (transceiver?.receiver) {
      if (opts?.codecs && kind === StreamKinds.VIDEO) {
        addTransceiverPreferredCodecs(transceiver, kind, opts?.codecs);
      }
      if (opts?.latencyMode && opts?.latencyMode !== LatencyMode.Default) {
        configLatencyMode(transceiver, opts?.latencyMode);
      }
    }
  }

  getTrack() {
    return getTrack(this.stream, this.kind);
  }

  addTrack(track: MediaStreamTrack) {
    this.stream.addTrack(track);
    this.hasTrack = true;
    this.emit('track_added', track);
  }

  stop() {
    this.stream.getTracks().forEach((track) => track.stop());
    this.emit('stopped');
  }

  pause() {
    this.stream.getTracks().forEach((track) => (track.enabled = false));
  }
}
