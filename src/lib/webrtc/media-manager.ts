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
   * @param audioEnabled Request audio track (will request permissions)
   * @param videoEnabled Request video track (will request permissions)
   * @param audioInitiallyEnabled Initial enabled state for audio track (default: false)
   * @param videoInitiallyEnabled Initial enabled state for video track (default: false)
   */
  async startMedia(
    audioInitiallyEnabled: boolean = false,
    videoInitiallyEnabled: boolean = false
  ): Promise<MediaStream | null> {
    try {
      console.log(`[MediaManager] 🎤 Starting media - requesting permissions for audio and video`);
      console.log(`[MediaManager] 🔇 Initial enabled state - audio: ${audioInitiallyEnabled}, video: ${videoInitiallyEnabled}`);

      // ALWAYS request both audio and video to have tracks available
      // We control their enabled state separately
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      };

      try {
        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error: unknown) {
        // If both fail, try audio only
        if (error instanceof Error && error.name === 'NotReadableError') {
          console.warn("[MediaManager] ⚠️ Video device busy, falling back to audio only");
          const audioOnlyConstraints: MediaStreamConstraints = {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          };
          this.localStream = await navigator.mediaDevices.getUserMedia(audioOnlyConstraints);
        } else {
          throw error;
        }
      }
      
      // Set initial track enabled state to match requested initial state
      // This ensures tracks start disabled even though we requested permissions
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = audioInitiallyEnabled;
      });
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = videoInitiallyEnabled;
      });
      
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
   * NOTE: Does NOT stop the old stream because those tracks may still be in use
   * by peer connections. The caller (ConnectionManager) should handle track cleanup.
   */
  setLocalStream(stream: MediaStream): void {
    console.log("[MediaManager] 🔄 Replacing local stream");
    
    // Don't stop old stream - tracks may be in use by peer connections
    // Just replace the reference
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
