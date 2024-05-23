import type { StreamKinds } from '../../lib/utils';
import type { AnyFunction, Codecs, StreamRemoteScalingType } from '../utils/types';
import type { StreamReceiverState } from './receiver';
import type { StreamSenderState } from './sender';
import type { SessionTrackState } from './session';

/**
 * Represents an interface for a RPC (Remote Procedure Call) Handler.
 */
export interface IRPC {
  connected: boolean;
  /**
   * Sends an RPC request with the specified command and data.
   * @param cmd The command to be executed.
   * @param data The data to be sent with the request.
   * @returns A promise that resolves to the response from the RPC server.
   */
  request<TRequest extends keyof RpcRequests>(
    cmd: TRequest,
    data: RpcRequests[TRequest]['params'],
    timeout?: number,
  ): Promise<RpcResponse<RpcRequests[TRequest]['response']>>;

  /**
   * Registers an event handler for the specified command.
   * @param cmd The command to listen for.
   * @param handler The event handler function.
   */
  on<TEvent extends keyof RpcEvents>(cmd: TEvent, handler: (data: RpcEvents[TEvent]) => void): IRPC;

  /**
   * Unregisters the event handler for the specified command.
   * @param cmd The command to stop listening for.
   */
  off<TEvent extends keyof RpcEvents>(cmd: TEvent, handler: AnyFunction): void;

  /**
   * Unregisters all event handlers for the specified command.
   * @param cmd The command to stop listening for.
   */
  offAllListeners(cmd: keyof RpcEvents): void;
}

export type RpcRequests = {
  'session.update_sdp': {
    params: {
      sdp: string;
      tracks: SessionTrackState;
    };
    response: {
      sdp: string;
    };
  };

  'room.peers.subscribe': {
    params: {
      peer_ids: string[];
    };
    response: null;
  };

  'room.peers.unsubscribe': {
    params: {
      peer_ids: string[];
    };
    response: null;
  };

  'session.disconnect': {
    params: null;
    response: null;
  };

  'session.senders.switch': {
    params: {
      id: string;
      source?: {
        id: string;
        screen: boolean;
      };
      metadata?: string;
    };
    response: null;
  };

  'session.senders.toggle': {
    params: {
      id: string;
      active: boolean;
    };
    response: null;
  };

  'session.receivers.switch': {
    params: {
      id: string;
      source?: {
        peer_id: string;
        track_id: string;
      };
      priority?: number;
    };
    response: null;
  };

  'session.receivers.limit': {
    params: {
      id: string;
      priority: number;
      min_spatial?: number;
      min_temporal?: number;
      max_spatial: number;
      max_temporal: number;
    };
    response: null;
  };

  'session.features.mix_minus.sources.add': {
    params: {
      sources: {
        peer_id: string;
        track_id: string;
      }[];
    };
    response: null;
  };

  'session.features.mix_minus.sources.remove': {
    params: {
      sources: {
        peer_id: string;
        track_id: string;
      }[];
    };
    response: null;
  };

  'session.features.mix_minus.pause': {
    params: null;
    response: null;
  };

  'session.features.mix_minus.resume': {
    params: null;
    response: null;
  };
};

export type RpcResponse<T> = {
  status: boolean;
  data: T;
  error?: string;
};

export type RpcMessage<T = unknown> = {
  type: 'event' | 'request' | 'answer';
  seq: number;
  cmd?: string;
  data?: T;
  success?: boolean;
  error_code?: string;
  error_msg?: string;
};

export type RpcEvents = {
  'rpc.connected': {};
  'room.peers.added': {
    peer_id: string;
    metadata?: string;
  };
  'room.peers.removed': {
    peer_id: string;
  };
  'room.tracks.added': {
    kind: StreamKinds;
    peer_id: string;
    track_id: string;
    source: {
      id: string;
      screen: boolean;
    };
    metadata?: string;
    state: {
      active: boolean;
      scaling?: StreamRemoteScalingType;
    };
  };
  'room.tracks.updated': {
    kind: StreamKinds;
    peer_id: string;
    track_id: string;
    source: {
      id: string;
      screen: boolean;
    };
    metadata?: string;
    state: {
      active: boolean;
      scaling?: StreamRemoteScalingType;
    };
  };
  'room.tracks.removed': {
    kind: StreamKinds;
    peer_id: string;
    track_id: string;
  };
  'session.disconnect': {};
  'session.goaway': {
    reason: 'shutdown' | 'kick';
    message?: string;
    remain_seconds: number;
  };
  'session.senders.state': {
    id: string;
    state: StreamSenderState;
  };
  'session.receivers.state': {
    id: string;
    state: StreamReceiverState;
    source?: {
      scaling?: 'simulcast' | 'svc';
      spatial: number;
      temporal: number;
      codec: Codecs;
    };
  };
  'session.receivers.stats': {
    id: string;
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
  };
  'session.features.mix_minus.state': {
    slots: {
      source?: {
        peer_id: string;
        track_id: string;
        audio_level: number;
      };
    }[];
  };
};
