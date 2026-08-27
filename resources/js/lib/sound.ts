// Beep corto sintetizado con Web Audio API — sin archivo externo que
// descargar/licenciar, para el aviso de alertas de stock bajo.
//
// Los navegadores arrancan un AudioContext nuevo en estado "suspended" y
// solo lo activan tras un gesto del usuario (click/tecla) — como el beep se
// dispara desde un poll automático (sin gesto en ese instante), se
// reutiliza un único AudioContext creado/reanudado en el primer click de la
// app, para que ya esté desbloqueado cuando la alerta necesite sonar.
let sharedContext: AudioContext | null = null;

function getAudioContextClass(): typeof AudioContext | undefined {
    return window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

function unlockAudioContext() {
    const AudioContextClass = getAudioContextClass();
    if (!AudioContextClass) return;
    if (!sharedContext) {
        sharedContext = new AudioContextClass();
    }
    if (sharedContext.state === 'suspended') {
        sharedContext.resume().catch(() => {});
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', unlockAudioContext, { once: true });
    window.addEventListener('keydown', unlockAudioContext, { once: true });
}

export function playAlertBeep() {
    try {
        const AudioContextClass = getAudioContextClass();
        if (!AudioContextClass) return;
        if (!sharedContext) {
            sharedContext = new AudioContextClass();
        }
        const ctx = sharedContext;
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
        const now = ctx.currentTime;

        [880, 660].forEach((freq, i) => {
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = freq;

            const start = now + i * 0.15;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);

            oscillator.connect(gain);
            gain.connect(ctx.destination);
            oscillator.start(start);
            oscillator.stop(start + 0.15);
        });
    } catch {
        // Web Audio no disponible — no es crítico
    }
}
