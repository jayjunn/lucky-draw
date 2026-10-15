// Web Audio API를 활용한 순수 오디오 이펙트 생성기 (외부 mp3 파일 의존성 없음)

class SoundFX {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initCtx() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // 롤링 틱 사운드 (숫자가 돌아갈 때)
  public playTick() {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400 + Math.random() * 200, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // 무시
    }
  }

  // 긴장감 고조 드럼롤
  public playDrumRoll(durationSec: number = 3) {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      const interval = 80; // ms
      const count = Math.floor((durationSec * 1000) / interval);
      let step = 0;

      const timer = setInterval(() => {
        if (step >= count || this.isMuted) {
          clearInterval(timer);
          return;
        }
        this.playTick();
        step++;
      }, interval);
    } catch {
      // 무시
    }
  }

  // 대망의 당첨 팡파레! (도-미-솔-도 트럼펫 화음)
  public playFanfare() {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.15 }, // C5
        { freq: 523.25, time: 0.15, dur: 0.12 }, // C5
        { freq: 523.25, time: 0.28, dur: 0.12 }, // C5
        { freq: 659.25, time: 0.42, dur: 0.35 }, // E5
        { freq: 783.99, time: 0.8, dur: 0.3 },  // G5
        { freq: 1046.50, time: 1.15, dur: 0.7 }, // C6
      ];

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.time);

        // 부드러운 엔벨로프
        gain.gain.setValueAtTime(0.001, ctx.currentTime + note.time);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + note.time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.time + note.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + note.time);
        osc.stop(ctx.currentTime + note.time + note.dur + 0.05);
      });
    } catch {
      // 무시
    }
  }

  // 박수/환호 효과
  public playCheer() {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      // 노이즈 버퍼로 박수 소리 시뮬레이션
      const bufferSize = ctx.sampleRate * 1.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, ctx.currentTime);
      filter.Q.setValueAtTime(1, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noise.stop(ctx.currentTime + 1.5);
    } catch {
      // 무시
    }
  }
}

export const soundFX = new SoundFX();
