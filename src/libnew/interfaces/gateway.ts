import type { BitrateControlMode, MixMinusMode } from '../utils';
import type { SessionTrackState } from './session';

export interface IConnectResponse {
  status: boolean;
  data: {
    conn_id: string;
    sdp: string;
  };
  error: string;
}

export interface IFeatures {
  mix_minus?: {
    mode: MixMinusMode;
    sources: {
      peer: string;
      track: string;
    }[];
  };
}

export interface IConnectConfig {
  version?: string;
  room: string;
  peer: string;
  token: string;
  metadata?: string;
  event: {
    publish: 'full' | 'track';
    subscribe: 'full' | 'track' | 'manual';
  };
  bitrate: {
    ingress: BitrateControlMode;
  };
  features: IFeatures;
  tracks: SessionTrackState;
  sdp?: string;
}

/**
 * Represents a media server gateway connector.
 */
export interface IMediaGatewayConnector {
  /**
   * Connects to the media server using the provided configuration.
   * @param url - The URL of the media server.
   * @param config - The connection configuration.
   */
  connect(url: string, config: IConnectConfig): Promise<IConnectResponse>;

  /**
   * Sends a ice candidate update to the media server.
   * @param url - The URL of the media server.
   * @param nodeId - The ID of the node.
   * @param connId - The ID of the connection.
   * @param ice - The ICE candidate event.
   */
  iceCandidate(url: string, nodeId: number, connId: string, ice: RTCPeerConnectionIceEvent): void;

  /**
   * Restarts the ICE connection.
   * @param url - The URL of the media server.
   * @param nodeId - The ID of the node.
   * @param connId - The ID of the connection.
   * @param sdp - The SDP offer.
   */
  restartIce(url: string, nodeId: number, connId: string, sdp: string): Promise<IConnectResponse>;
}
