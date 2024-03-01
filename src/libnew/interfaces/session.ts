import type { SenderConfig } from '../../lib/interfaces';
import type { Peer } from '../peer';
import type { RemoteStream } from '../remote';
import type {
  LatencyMode,
  Codecs,
  MixMinusMode,
  BitrateControlMode,
  LogLevel,
  RoomStats,
  StreamKinds,
} from '../utils/types';
import type { RealtimeSocketState } from './rtsocket';

/**
 * Represents the callbacks for a session.
 */
export interface ISessionCallbacks {
  /**
   * Callback function triggered when my stream is added.
   * @param stream The added my stream.
   */
  'local_stream.added': (stream: RemoteStream) => void;

  /**
   * Callback function triggered when my stream is removed.
   * @param stream The removed my stream.
   */
  'local_stream.removed': (stream: RemoteStream) => void;

  /**
   * Callback function triggered when my stream is updated.
   * @param stream The updated my stream.
   */
  'local_stream.updated': (stream: RemoteStream) => void;

  /**
   * Callback function triggered when a stream is added.
   * @param stream The added stream.
   */
  'stream.added': (stream: RemoteStream) => void;

  /**
   * Callback function triggered when a stream is removed.
   * @param stream The removed stream.
   */
  'stream.removed': (stream: RemoteStream) => void;

  /**
   * Callback function triggered when a stream is updated.
   * @param stream The updated stream.
   */
  'stream.updated': (stream: RemoteStream) => void;

  'peer.added': (peer: Peer) => void;
  'peer.removed': (peer: Peer) => void;

  /**
   * Callback function triggered when the room stats are updated.
   * @param stats The updated room stats.
   */
  'room_stats': (stats: RoomStats) => void;

  /**
   * Callback function triggered when the peer state changes.
   * @param state The new state of the peer.
   */
  'peer_state': (state: RealtimeSocketState) => void;

  /**
   * Callback function triggered when the data channel state changes.
   * @param state The new state of the data channel.
   */
  'dc_state': (state: RealtimeSocketState) => void;

  /**
   * Callback function triggered when the session is disconnected.
   * @param reason The reason for the disconnection.
   */
  'disconnected': (reason: string) => void;

  /**
   * Callback function triggered when the session is reconnected.
   */
  'reconnected': () => void;

  /**
   * Callback function triggered when the session is reconnected.
   */
  'reconnecting': () => void;

  /**
   * Callback function triggered when the session is connected.
   */
  'connected': () => void;
}

/**
 * Represents the configuration for a session.
 */
export interface ISessionConfig {
  /**
   * The ID of the room.
   * @example 'room1'
   * @example 'room2'
   */
  roomId: string;

  /**
   * The ID of the peer.
   * @example 'peer1'
   * @example 'peer2'
   */
  peerId: string;

  /**
   * Config how the session should handle events.
   * publish 'full' for publishing all peers info and track info. 'track' for only track info.
   * subscribe 'full' for subscribing all peers info and track info. 'track' for only track info. While 'manual' for manual control.
   * Manual control means you can control the peers subscription dynamicaly by using the subsribePeer method.
   *
   */
  event?: {
    publish: 'full' | 'track';
    subscribe: 'full' | 'track' | 'manual';
  };

  bitrate?: {
    /**
     * Config how the session should handle bitrate.
     * In `save` mode, the media server will limit the bitrate based on the network and consumers. In `max` mode, the media server will only limit the bitrate based on the network and media server configuration.
     */
    ingress: BitrateControlMode;
  };

  /**
   * The token for the session.
   * Can be retrieved from the media server.
   */
  token: string;

  /**
   * Initialized Senders for the session.
   * @example [{ name: 'video_camera', kind: 'audio', stream: stream1 },
   * { name: 'screen', kind: 'video', stream: stream2, screen: true }}]
   *
   */
  senders?: SenderConfig[];

  /**
   * The number of receivers the session will be pre-allocated at connect time.
   * This is so that the media server can pre-allocate the resources for the session.
   * You can also dynamically add receivers later.
   * @example { audio: 1, video: 1 }
   *
   */
  receivers?: {
    audio?: number;
    video?: number;
  };

  /**
   * Optional configuration for mix-minus audio.
   */
  mixMinusAudio?: {
    /**
     * The elements for mix-minus audio.
     */
    elements?: [HTMLAudioElement, HTMLAudioElement, HTMLAudioElement];
    /**
     * The mode for mix-minus audio.
     */
    mode: MixMinusMode;
  };

  /**
   * Optional latency mode for the session.
   */
  latencyMode?: LatencyMode;

  /**
   * Optional ICE servers for the session.
   */
  iceServers?: [{ urls: string; username?: string; credential?: string }];

  /**
   * Optional codecs for the session.
   */
  codecs?: Codecs[];

  /**
   * Optional bitrate control mode for the session.
   */
  bitrateControlMode?: BitrateControlMode;

  /**
   * Log level for the session.
   */
  logLevel?: LogLevel;

  /**
   * Connect timeout in milliseconds.
   */
  timeout?: number;
}

export type SessionEvent = keyof ISessionCallbacks;

export type SessionTrackState = {
  receivers: {
    kind: StreamKinds;
    id: string;
    state?: {
      source?: {
        peer_id: string;
        track_id: string;
      };
      limit?: {
        priority: number;
        min_spatial?: number;
        min_temporal?: number;
        max_spatial: number;
        max_temporal: number;
      };
    };
  }[];
  senders: {
    kind: StreamKinds;
    id: string;
    state?: {
      active: boolean;
    };
    metadata?: string;
    source?: {
      id: string;
      screen: boolean;
    };
  }[];
};
