export enum LogLevel {
  None = 0,
  Error = 1,
  Warn = 2,
  Info = 3,
  Debug = 4,
}

export interface RoomStats {
  peers: number;
}

export enum StreamKinds {
  AUDIO = 'audio',
  VIDEO = 'video',
}

export enum Codecs {
  OPUS = 'opus',
  VP8 = 'vp8',
  VP9 = 'vp9',
  H264 = 'h264',
  H265 = 'h265',
  AV1 = 'av1',
}

export enum ContentHint {
  None = 'none',
  Motion = 'motion',
  Detail = 'detail',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFunction = (...args: any[]) => any;

export enum LatencyMode {
  UltraLow = 'ultra-low',
  Default = 'default',
  Smooth200 = 'smooth-200',
  Smooth500 = 'smooth-500',
  Smooth800 = 'smooth-800',
  Smooth1000 = 'smooth-1000',
  Smooth2000 = 'smooth-2000',
}

export enum BitrateControlMode {
  Save = 'save',
  Max = 'max',
}

export enum MixMinusMode {
  Auto = 'auto',
  Manual = 'manual',
}

export enum StreamRemoteScalingType {
  SINGLE = 'single',
  SIMULCAST = 'simulcast',
  SVC = 'svc',
}

export enum StreamRemoteStatus {
  New = 'new',
  Connecting = 'connecting',
  Connected = 'connected',
  Reconnecting = 'reconnecting',
  Disconnected = 'disconnected',
}

export type RemoteStreamQuality = {
  peer: string;
  name: string;
  kind: StreamKinds;
  mos: number;
  slot?: number;
};


/**
 * @param priority - The priority of the stream (default: 50).
 * @param minSpatial - The minimum spatial limit for the stream (default: 0).
 * @param maxSpatial - The maximum spatial limit (default: 2).
 * @param minTemporal - The minimum temporal layer for the stream (default: 0).
 * @param maxTemporal - The maximum temporal limit (default: 2).
 */
export type StreamLimit = {
  priority: number;
  minSpatial?: number;
  maxSpatial: number;
  minTemporal?: number;
  maxTemporal: number;
};
