import type { Codecs, ContentHint, StreamKinds } from '../utils/types';

export enum StreamSenderState {
  Created = 'created',
  Waiting = 'waiting',
  Active = 'active',
  Inactive = 'inactive',
  NoSource = 'no-source',
}

export interface IStreamSenderCallbacks {
  state: (state: StreamSenderState) => void;
  audio_level: (level: number) => void;
  stopped: () => void;
}

export interface SenderConfig extends SenderOptions {
  kind: StreamKinds;
  name: string;
}


/**
 * Configuration options for a sender.
 */
export type SenderOptions = {
  /**
   * The stream of the sender.
   */
  stream?: MediaStream | null;

  /**
   * The preferred codecs of the sender.
   * This will be used to determine the order of the codecs in the SDP.
   *
   * @example ['VP8', 'H264']
   */
  preferredCodecs?: Codecs[];

  /**
   * Whether the sender should be simulcasted.
   * @default false
   */
  simulcast?: boolean;

  /**
   * The maximum bitrate of the sender.
   * @default 0
   */
  maxBitrate?: number;

  /**
   * The content hint of the sender.
   */
  contentHint?: ContentHint;

  /**
   * Whether the sender is a screen share.
   * @default false
   */
  screen?: boolean;

  /**
   * The custom label of the sender.
   * @default track.label if not provided.
   */
  label?: string;
};
