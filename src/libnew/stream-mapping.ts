import type { RemoteStream } from './remote';

export class StreamMapping {
  peers: Map<string, RemoteStream> = new Map();

  constructor() {}

  add(peerHash: string, name: string, stream: RemoteStream) {
    this.peers.set(`${peerHash}/${name}`, stream);
  }

  remove(peerHash: string, name: string) {
    this.peers.delete(`${peerHash}/${name}`);
  }

  get(peerHash: string, name: string) {
    return this.peers.get(`${peerHash}/${name}`);
  }
}
