"""Tokenloom 30s showcase soundtrack — 110 BPM, A major pentatonic, playful pluck + half-time groove + UI SFX.
Every time below is derived from the same beat grid as index.html (B = 60/110, shot starts SB in beats)."""
from audio_lib import Mix, note as n, chord

BPM = 110; B = 60 / BPM; bt = lambda x: x * B
SB = [0, 3, 6, 11, 15, 20, 24, 26, 29, 31, 35, 39, 42, 46, 49, 51, 55]; ST = [bt(x) for x in SB]
PENT = [-12, -10, -8, -5, -3, 0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28]   # A major pentatonic, A3..C#7
ROOT = [-24, -27, -31, -29]                                                     # A2 F#2 D2 E2  (I vi IV V)
CH = ['Aadd9', 'F#m7', 'Dmaj9', 'E6']
m = Mix(duration=30, bpm=BPM, seed=11)
bar = lambda t: int((t + 1e-6) // bt(4)) % 4

# ---------- beds ----------
for k in range(14):  # 13.75 bars
    t0, t1 = bt(4 * k), min(30, bt(4 * k + 4))
    amp = .05 if (t1 <= ST[3] or t0 >= ST[15]) else .028          # ambient bed louder in intro / outro
    if t0 < 30: m.pad(chord(CH[k % 4], 3), t0, t1, amp)

# ---------- grooves ----------
def half(t0, t1):           # half-time: kick 1 + "and of 3", clap on 3, 8th hats, bouncing bass
    k = 0
    while bt(k) + t0 < t1 - 1e-6:
        t = t0 + bt(k); r = ROOT[bar(t)]
        m.hat(t + bt(.5), .02); m.hat(t + bt(.25), .008); m.hat(t + bt(.75), .008)
        if k % 4 == 0: m.kick(t, .22); m.bass(t, n(r), .11, .3)
        if k % 4 == 1: m.bass(t + bt(.5), n(r + 12), .07, .16)
        if k % 4 == 2: m.clap(t, .07)
        if k % 4 == 2: m.kick(t + bt(.5), .16); m.bass(t + bt(.5), n(r), .09, .22)
        if k % 4 == 3: m.bass(t + bt(.5), n(r + 7), .06, .14)
        k += 1
def four(t0, t1):           # climax: four on the floor
    k = 0
    while bt(k) + t0 < t1 - 1e-6:
        t = t0 + bt(k); r = ROOT[bar(t)]
        m.kick(t, .26); m.hat(t + bt(.5), .028); m.hat(t + bt(.25), .01); m.hat(t + bt(.75), .01)
        m.bass(t, n(r), .12, .2); m.bass(t + bt(.5), n(r + 12), .08, .16)
        if k % 2 == 1: m.clap(t, .08)
        k += 1
half(ST[3], ST[9]); four(ST[9], ST[10]); half(ST[10], ST[15])

# a hit on every cut
for i, tc in enumerate(ST[1:16], 1):
    m.boom(tc, .5 if i == 9 else .3 if i in (2, 15) else .18); m.kick(tc, .2)

# ---------- S01 open: sound first ----------
m.sub(0.0, n(-36), .22, 1.6); m.pluck(0.02, n(0), .12, 1.6)
m.whoosh(bt(.5) + .1, .5, .1, 600, 6000); m.pluck(bt(.5), n(12), .1, 1.2, .2); m.kick(bt(.5), .2)
m.bell(bt(.5) + .24, n(16), .1, 1.6); m.sub(bt(.5) + .24, n(-36), .18, 1.0)
for j in range(11): m.pluck(bt(1) + j * .032, n(PENT[5 + j % 8]), .045, .5, -.4 + j * .08)    # "1 color in." letters
m.typing(bt(1.3), bt(1.3) + .35, 7, .03)
for j in range(7): m.tick(bt(2.1) + j * .035, .02)
m.whoosh(bt(1.5) + .25, .5, .05, 900, 6000)                                            # warp threads drop
# ---------- S02 fabric + counter ----------
m.arp(ST[1] + .12, ST[1] + 1.05, [n(p) for p in PENT[3:14]], bt(.25) / 1.5, .05, 'pluck')
m.riser(ST[2], .55, .16); m.whoosh(ST[2] - .05, .6, .09, 300, 4000)
# ---------- S03 title ----------
m.chord_hit(ST[2], [n(-12), n(-5), n(-1), n(4), n(9)], 'pluck', .08, 1.8); m.bell(ST[2], n(12), .1, 2.2, -.2); m.bell(ST[2] + .02, n(19), .07, 2.2, .2)
for k in range(10): m.hat(ST[2] + bt(.5) + bt(k / 2), .012)
m.tick(ST[2] + bt(2.4), .03)
for i, p in enumerate([7, 9, 12]): m.pluck(ST[2] + bt(3.3) + i * .09, n(p), .07, .6)
m.riser(ST[3], .35, .1)
# ---------- S04 import ----------
s = ST[3]
for i, (tt, p) in enumerate([(bt(.4), 4), (bt(1), 7), (bt(1.5), 9)]): m.tick(s + tt, .04); m.pluck(s + tt, n(p), .06, .5)
m.tick(s + bt(2.5), .07); m.bell(s + bt(2.5), n(12), .07, .6)
m.pluck(s + bt(2.7), n(7), .07, .8); m.bell(s + bt(3.1), n(16), .08, 1.0); m.bell(s + bt(3.1) + .09, n(21), .07, 1.2)
m.typing(s + .05, s + .5, 5, .018)
# ---------- S05 library ----------
s = ST[4]
for i in range(4): m.pluck(s + bt(.5) + i * .09, n(PENT[6 + i]), .06, .6, -.3 + i * .2)
for k, (tt, p) in enumerate([(2, 7), (2.5, 9), (3, 12), (3.5, 14)]): m.tick(s + bt(tt), .05); m.pluck(s + bt(tt), n(p), .07, .5)
m.tick(s + bt(4), .06); m.bell(s + bt(4), n(19), .09, 1.2); m.bell(s + bt(4) + .02, n(12), .07, 1.2)
# ---------- S06 brand colour ----------
s = ST[5]
m.typing(s + .05, s + bt(1.1), 7, .035)
m.whoosh(s + bt(1.6), .5, .1, 500, 7000)
for i in range(11): m.bell(s + bt(1.6) + abs(i - 6) * .035, n(PENT[4 + i]), .045, .45, -.5 + i * .1)
m.bell(s + bt(3), n(16), .07, .8, .2); m.bell(s + bt(3) + .1, n(12), .06, .8, -.2)
# ---------- S07 radius strobe ----------
for k, p in enumerate([12, 14, 16, 19]):
    tb = ST[6] + k * B / 2; m.kick(tb, .22); m.snare(tb, .05); m.pluck(tb, n(p), .09, .4, -.3 + k * .2); m.bass(tb, n(ROOT[bar(tb)] + 12), .08, .14)
# ---------- S08 scope ----------
s = ST[7]
m.typing(s + .12, s + .52, 4, .035)
m.whoosh(s + bt(1.3) + .15, .35, .08, 800, 6000); m.bell(s + bt(1.3), n(9), .08, .6); m.bell(s + bt(1.3) + .12, n(16), .08, .8)
# ---------- S09 generate ----------
s = ST[8]
m.tick(s + bt(1), .09); m.kick(s + bt(1), .2); m.pluck(s + bt(1), n(12), .08, .4)
m.riser(ST[9], bt(1), .22); m.whoosh(ST[9] - .05, .6, .12, 200, 5000)
# ---------- S10 climax: a stab per number ----------
for k, base in enumerate([0, -3, -7, -5]):
    tb = ST[9] + bt(k)
    for d in (0, 4 if k in (0, 3) else 3, 7): m.lead(tb, n(base + d + 12), .32, .035, 2600, (d - 3) * .08)
    m.bell(tb, n(base + 24), .06, .5); m.sub(tb, n(base - 24), .16, .5)
m.riser(ST[10], .4, .1)
# ---------- S11 tiers ----------
s = ST[10]
for i in range(3): m.pluck(s + bt(.8 * i), n([7, 9, 12][i]), .07, .6)
m.whoosh(s + bt(1.1) + .2, .45, .06, 600, 5000); m.whoosh(s + bt(1.9) + .2, .45, .06, 600, 5000)
p0 = s + bt(2.4)
for i, p in enumerate([12, 16, 19]): m.bell(p0 + i * .3, n(p), .09, .8, -.3 + i * .3)
# ---------- S12 light / dark ----------
s = ST[11]
m.whoosh(s + bt(.35) + .25, .5, .1, 300, 6000); m.pluck(s, n(7), .07, .6); m.pluck(s + bt(.6), n(14), .07, .6)
m.typing(s + bt(1.8), s + bt(1.8) + .3, 7, .02)
# ---------- S13 propstar ----------
s = ST[12]
m.whoosh(s + .35, .5, .05, 900, 6000)
for d in range(6): m.pluck(s + bt(.9) + d * .06, n(PENT[6 + d]), .055, .45, -.4 + d * .16)
m.bell(s + bt(3), n(19), .08, .8); m.tick(s + bt(3), .05)
for tt in (2.1, 2.5, 2.9, 3.3, 3.7): m.tick(s + bt(tt), .04); m.pluck(s + bt(tt), n([7, 9, 12, 9, 14][int((tt - 2.1) / .4 + .01)]), .045, .4)
# ---------- S14 diff ----------
s = ST[13]
m.whoosh(s + .3, .4, .05, 400, 3000); m.whoosh(s + bt(1.5) + .25, .5, .08, 300, 4000)
m.chord_hit(s + bt(1.5) + .2, [n(-3), n(2), n(7)], 'pluck', .06, 1.0)
for r in range(5): m.tick(s + bt(1.9) + r * .06, .03)
# ---------- S15 quality gate ----------
s = ST[14]
for i in range(10): m.tick(s + .08 + i * .055, .04); m.pluck(s + .08 + i * .055, n(PENT[5 + i]), .05, .35, -.45 + i * .1)
m.bell(s + .655, n(24), .08, 1.0); m.bell(s + .675, n(19), .07, 1.0); m.clap(s + .655, .07); m.boom(s + .655, .2); m.kick(s + .655, .2)
# ---------- S16 end: countdown 3-2-1-0, then the wordmark ----------
s = ST[15]
for k, p in enumerate([19, 16, 12, 7]): m.bell(s + k * .13, n(p), .08, .5); m.tick(s + k * .13, .05)
m.kick(s + .39, .18)
m.boom(s + bt(1), .4); m.sub(s + bt(1), n(-36), .2, 1.4)
m.chord_hit(s + bt(1), [n(-12), n(-5), n(-1), n(4), n(9), n(12)], 'pluck', .08, 2.0); m.bell(s + bt(1), n(24), .07, 1.6)
for j in range(8): m.pluck(s + bt(1.1) + j * .04, n(PENT[8 + j % 7]), .03, .4, -.4 + j * .1)
m.typing(s + bt(1.4), s + bt(1.4) + .35, 8, .02)
m.whoosh(s + bt(2.4) + .5, .9, .05, 500, 6000); m.bell(s + bt(2.4), n(12), .05, 1.4); m.bell(s + bt(2.4) + .02, n(19), .04, 1.4)
m.render('audio.wav', reverb=.26, fade_out=.35)
