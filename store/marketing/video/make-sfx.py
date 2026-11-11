"""Synthesise the promo's sound effects into public/sfx/ (stdlib only, no samples to license)."""
import math, os, random, struct, wave

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public', 'sfx')
os.makedirs(OUT, exist_ok=True)
random.seed(7)


def save(name, samples):
    peak = max(1e-9, max(abs(s) for s in samples))
    with wave.open(os.path.join(OUT, name), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<h', int(s / peak * 0.9 * 32767)) for s in samples))


def bell(freq, dur, decay):
    return [
        math.sin(2 * math.pi * freq * t) * math.exp(-t * decay) + 0.3 * math.sin(2 * math.pi * freq * 2.01 * t) * math.exp(-t * decay * 1.6)
        for t in (i / SR for i in range(int(dur * SR)))
    ]


def mix(dur, parts):
    buf = [0.0] * int(dur * SR)
    for start, sig, gain in parts:
        o = int(start * SR)
        for i, s in enumerate(sig):
            if o + i < len(buf):
                buf[o + i] += s * gain
    return buf


# soft UI tap
tap = [(math.sin(2 * math.pi * 1400 * t) * 0.6 + (random.random() * 2 - 1) * 0.4) * math.exp(-t * 90) for t in (i / SR for i in range(int(0.08 * SR)))]
save('tap.wav', tap)

# arrival chime: two notes
save('chime.wav', mix(0.9, [(0, bell(1318.5, 0.8, 6), 1), (0.11, bell(1760, 0.8, 5), 1)]))

# unlock sparkle: rising arpeggio C6 E6 G6 C7 E7 with a soft noise shimmer
notes = [1046.5, 1318.5, 1568, 2093, 2637]
parts = [(k * 0.055, bell(f, 1.0, 5), 0.8) for k, f in enumerate(notes)]
shimmer = [(random.random() * 2 - 1) * 0.15 * math.exp(-t * 4) * min(1, t * 30) for t in (i / SR for i in range(int(1.0 * SR)))]
parts.append((0, shimmer, 1))
save('sparkle.wav', mix(1.3, parts))

# pops at three pitches: quick downward blip
for k, f0 in enumerate([700, 880, 1050]):
    sig, ph = [], 0.0
    for i in range(int(0.09 * SR)):
        t = i / SR
        f = f0 * (1.6 - 0.6 * min(1, t / 0.03))
        ph += 2 * math.pi * f / SR
        sig.append(math.sin(ph) * math.exp(-t * 45))
    save(f'pop{k + 1}.wav', sig)

# whoosh: noise swell, crude low-pass
sig, y = [], 0.0
dur = 0.6
for i in range(int(dur * SR)):
    t = i / SR
    env = math.sin(math.pi * t / dur) ** 2
    a = 0.02 + 0.1 * env
    y += a * ((random.random() * 2 - 1) - y)
    sig.append(y * env)
save('whoosh.wav', sig)
print('sfx ready')
