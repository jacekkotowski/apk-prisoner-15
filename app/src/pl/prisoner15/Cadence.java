package pl.prisoner15;

/** Steps per minute from step times, and the walking or running call. Plain Java, so it can be tested without a phone. */
final class Cadence {
    /** At or above this many steps per minute it counts as running. A starting guess for an easy jog; check it on real runs. */
    static final double RUN_SPM = 135;

    private final long[] ring = new long[512];
    private int head, size;
    private long first = -1;

    void reset() { head = 0; size = 0; first = -1; }

    void step(long ms) {
        if (first < 0) first = ms;
        ring[(head + size) % ring.length] = ms;
        if (size < ring.length) size++; else head = (head + 1) % ring.length;
    }

    int count(long now, long windowMs) {
        int n = 0;
        for (int i = 0; i < size; i++) { long t = ring[(head + i) % ring.length]; if (t > now - windowMs && t <= now) n++; }
        return n;
    }

    /** Steps per minute over the last windowMs; early on the window shrinks to the time since the first step (never under 3 s). */
    double perMinute(long now, long windowMs) {
        if (first < 0) return 0;
        long w = Math.min(windowMs, Math.max(3000, now - first));
        return count(now, w) * 60000.0 / w;
    }

    boolean running(long now, long windowMs) { return perMinute(now, windowMs) >= RUN_SPM; }
}
