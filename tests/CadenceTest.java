package pl.prisoner15;

/** Run with tests/java.sh. */
public class CadenceTest {
    static void check(boolean ok, String what) { if (!ok) { System.out.println("FAIL: " + what); System.exit(1); } }

    static void steps(Cadence c, long fromMs, long toMs, double spm) { long gap = Math.round(60000 / spm); for (long t = fromMs; t < toMs; t += gap) c.step(t); }

    public static void main(String[] a) {
        Cadence c = new Cadence();
        check(!c.running(5000, 15000) && c.perMinute(5000, 15000) == 0, "no steps is not running");
        steps(c, 1000, 31000, 150); check(c.running(31000, 15000), "150 steps/min is running"); check(Math.abs(c.perMinute(31000, 15000) - 150) < 10, "cadence near 150");
        c.reset(); steps(c, 1000, 31000, 112); check(!c.running(31000, 15000), "112 steps/min is walking");
        c.reset(); steps(c, 0, 3000, 160); check(c.running(3000, 15000), "the first seconds of a jog already count as running");
        // a run, then a walk break: the short window shows walking again only after the transition; hence the 12 s grace before warning
        c = new Cadence(); steps(c, 0, 60000, 160); steps(c, 60000, 90000, 112);
        check(c.running(62000, 8000), "2 s into a walk break the window still shows running");
        check(!c.running(72000, 8000), "12 s into a walk break, still running is false when walking");
        // still running 12 s into a walk break: the warning case
        c = new Cadence(); steps(c, 0, 90000, 160); check(c.running(72000, 8000), "keeps running through the walk break: warn");
        // standing still after a run
        c = new Cadence(); steps(c, 0, 20000, 160); check(c.perMinute(60000, 15000) == 0 && !c.running(60000, 15000), "stopped: no steps in the window");
        // the ring holds a long run without breaking
        c = new Cadence(); steps(c, 0, 600000, 170); check(c.running(600000, 15000), "ten minutes of steps");
        System.out.println("CADENCE PASS");
    }
}
