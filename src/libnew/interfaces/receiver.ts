import type { Codecs, LatencyMode, RemoteStreamQuality } from '../utils/types';

export enum StreamReceiverState {
  NoSource = 'no_source',
  Waiting = 'waiting',
  Live = 'live',
  KeyOnly = 'key_only',
  Inactive = 'inactive',
}

export interface ReceiverStats {
  source?: {
    bitrate: number;
    rtt: number;
    lost: number;
    jitter: number;
  };
  transmit?: {
    spatial: number;
    temporal: number;
    bitrate: number;
  };
}

export interface IStreamReceiverCallbacks {
  state: (state: StreamReceiverState) => void;
  audio_level: (level: number) => void;
  stats: (stats: ReceiverStats) => void;
  disconnected: () => void;
  track_added: (track: MediaStreamTrack) => void;
  quality: (quality: RemoteStreamQuality) => void;
}

export type ReceiverConfig = {
  codecs?: Codecs[];
  latencyMode?: LatencyMode;
};
