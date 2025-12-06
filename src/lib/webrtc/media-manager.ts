/**
 * Media Manager
 * 
 * Manages local media streams (audio/video)
 * Responsibilities:
 * - Acquire and manage local media devices
 * - Toggle audio/video tracks
 * - Handle media permissions
 * - Manage media constraints
 */

export class MediaManager {
  private localStream: MediaStream | null = null;

  constructor() {
    console.log("[MediaManager] Initialized");
  }

  /**
   * Start local media with specified constraints
   */
  async startMedia(audioEnabled: boolean = true, videoEnabled: boolean = false): Promise<MediaStream | null> {
    try {
      console.log(`[MediaManager] 🎤 Starting media - audio: ${audioEnabled}, video: ${videoEnabled}`);

      const constraints: MediaStreamConstraints = {
        audio: audioEnabled ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : false,
        video: videoEnabled ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        } : false,
      };

      try {
        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error: any) {
        // If video fails, try audio only
        if (videoEnabled && error.name === 'NotReadableError') {
          console.warn("[MediaManager] ⚠️ Video device busy, falling back to audio only");
          const audioOnlyConstraints: MediaStreamConstraints = {
            audio: audioEnabled ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            } : false,
            video: false,
          };
          this.localStream = await navigator.mediaDevices.getUserMedia(audioOnlyConstraints);
        } else {
          throw error;
        }
      }
      
      console.log("[MediaManager] ✅ Media stream acquired");
      console.log(`[MediaManager]   - Audio tracks: ${this.localStream.getAudioTracks().length}`);
      console.log(`[MediaManager]   - Video tracks: ${this.localStream.getVideoTracks().length}`);
      
      this.localStream.getTracks().forEach((track) => {
        console.log(`[MediaManager]   - ${track.kind}: enabled=${track.enabled}, state=${track.readyState}`);
      });

      return this.localStream;
    } catch (error) {
      console.error("[MediaManager] ❌ Error accessing media devices:", error);
      throw error;
    }
  }

  /**
   * Stop all media tracks
   */
  stopMedia(): void {
    if (this.localStream) {
      console.log("[MediaManager] 🛑 Stopping all media tracks");
      
      this.localStream.getTracks().forEach((track) => {
        console.log(`[MediaManager]   - Stopping ${track.kind} track`);
        track.stop();
      });
      
      this.localStream = null;
      console.log("[MediaManager] ✅ All tracks stopped");
    }
  }

  /**
   * Toggle audio track
   */
  toggleAudio(enabled: boolean): void {
    if (!this.localStream) {
      console.warn("[MediaManager] ⚠️ Cannot toggle audio - no stream");
      return;
    }

    const audioTracks = this.localStream.getAudioTracks();
    console.log(`[MediaManager] 🎤 Toggling audio to ${enabled} (${audioTracks.length} tracks)`);
    
    audioTracks.forEach((track) => {
      track.enabled = enabled;
      console.log(`[MediaManager]   - Track ${track.id}: enabled=${track.enabled}`);
    });
  }

  /**
   * Toggle video track
   */
  toggleVideo(enabled: boolean): void {
    if (!this.localStream) {
      console.warn("[MediaManager] ⚠️ Cannot toggle video - no stream");
      return;
    }

    const videoTracks = this.localStream.getVideoTracks();
    console.log(`[MediaManager] 📹 Toggling video to ${enabled} (${videoTracks.length} tracks)`);
    
    videoTracks.forEach((track) => {
      track.enabled = enabled;
      console.log(`[MediaManager]   - Track ${track.id}: enabled=${track.enabled}`);
    });
  }

  /**
   * Get the current local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Check if audio is enabled
   */
  isAudioEnabled(): boolean {
    if (!this.localStream) return false;
    const audioTracks = this.localStream.getAudioTracks();
    return audioTracks.length > 0 && audioTracks[0].enabled;
  }

  /**
   * Check if video is enabled
   */
  isVideoEnabled(): boolean {
    if (!this.localStream) return false;
    const videoTracks = this.localStream.getVideoTracks();
    return videoTracks.length > 0 && videoTracks[0].enabled;
  }

  /**
   * Replace the current stream (useful when adding video to audio-only stream)
   */
  setLocalStream(stream: MediaStream): void {
    console.log("[MediaManager] 🔄 Replacing local stream");
    
    // Stop old stream
    if (this.localStream) {
      this.stopMedia();
    }
    
    this.localStream = stream;
    console.log("[MediaManager] ✅ Stream replaced");
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    console.log("[MediaManager] 🧹 Cleaning up");
    this.stopMedia();
    console.log("[MediaManager] ✅ Cleanup complete");
  }
}
