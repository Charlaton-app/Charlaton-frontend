/**
 * Notification Sounds Utility
 * Provides audio feedback for events using Web Audio API
 * Creates synthetic sounds to avoid external dependencies
 */

class NotificationSounds {
  private audioContext: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
    }
  }

  /**
   * Play a simple beep sound
   * @param frequency - Sound frequency in Hz
   * @param duration - Duration in milliseconds
   * @param type - Waveform type
   */
  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine'
  ): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    // Envelope for smooth sound
    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      now + duration / 1000
    );

    oscillator.start(now);
    oscillator.stop(now + duration / 1000);
  }

  /**
   * User joined meeting sound - ascending tone
   */
  public userJoined(): void {
    if (!this.audioContext) return;

    this.playTone(523.25, 100, 'sine'); // C5
    setTimeout(() => this.playTone(659.25, 150, 'sine'), 100); // E5
  }

  /**
   * User left meeting sound - descending tone
   */
  public userLeft(): void {
    if (!this.audioContext) return;

    this.playTone(659.25, 100, 'sine'); // E5
    setTimeout(() => this.playTone(523.25, 150, 'sine'), 100); // C5
  }

  /**
   * New message sound - single gentle tone
   */
  public newMessage(): void {
    if (!this.audioContext) return;

    this.playTone(880, 120, 'sine'); // A5
  }

  /**
   * Error sound - lower, longer tone
   */
  public error(): void {
    if (!this.audioContext) return;

    this.playTone(220, 200, 'square'); // A3
  }

  /**
   * Success sound - pleasant ascending tones
   */
  public success(): void {
    if (!this.audioContext) return;

    this.playTone(523.25, 80, 'sine'); // C5
    setTimeout(() => this.playTone(659.25, 80, 'sine'), 80); // E5
    setTimeout(() => this.playTone(783.99, 120, 'sine'), 160); // G5
  }

  /**
   * Warning sound - two quick tones
   */
  public warning(): void {
    if (!this.audioContext) return;

    this.playTone(440, 100, 'square'); // A4
    setTimeout(() => this.playTone(440, 100, 'square'), 150);
  }
}

// Export singleton instance
export const notificationSounds = new NotificationSounds();
