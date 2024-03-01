
export interface IReceiverTrackCallbacks {
  track_added: (track: MediaStreamTrack) => void;
  stopped: () => void;
}

export interface ISenderTrackCallbacks {
  stopped: () => void;
}
