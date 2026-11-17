import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Academic Examination Integrity Proctoring Logic", () => {
  const MAX_STRIKES = 3;
  const RATE_LIMIT_MS = 2500;

  function createProctoringEngine() {
    let strikes = 0;
    let lastEventTime = -Infinity;
    let isTerminated = false;
    let eventsLog = [];

    return {
      recordEvent: (reason, eventType, currentTime = Date.now()) => {
        if (isTerminated) return { status: "ALREADY_TERMINATED" };

        if (currentTime - lastEventTime < RATE_LIMIT_MS) {
          return { status: "RATE_LIMITED", strikes };
        }

        lastEventTime = currentTime;
        strikes += 1;
        eventsLog.push({ strike: strikes, reason, eventType, time: currentTime });

        if (strikes >= MAX_STRIKES) {
          isTerminated = true;
          return { status: "TERMINATED", strikes, eventsLog };
        }

        return { status: "WARNING", strikes, eventsLog };
      },
      getStrikes: () => strikes,
      isDisqualified: () => isTerminated,
    };
  }

  it("should issue warnings for Strike 1 and Strike 2 without terminating the session", () => {
    const engine = createProctoringEngine();

    const strike1 = engine.recordEvent("Window lost focus", "WINDOW_BLUR", 1000);
    assert.equal(strike1.status, "WARNING");
    assert.equal(strike1.strikes, 1);
    assert.equal(engine.isDisqualified(), false);

    const strike2 = engine.recordEvent("Tab switched to background", "VISIBILITY_CHANGE", 4000);
    assert.equal(strike2.status, "WARNING");
    assert.equal(strike2.strikes, 2);
    assert.equal(engine.isDisqualified(), false);
  });

  it("should rate-limit focus departures occurring within the 2.5s grace window", () => {
    const engine = createProctoringEngine();

    engine.recordEvent("Window blur", "WINDOW_BLUR", 1000);
    assert.equal(engine.getStrikes(), 1);

    // Event 800ms later (transient OS alert or popup)
    const burstEvent = engine.recordEvent("Rapid tab switch", "VISIBILITY_CHANGE", 1800);
    assert.equal(burstEvent.status, "RATE_LIMITED");
    assert.equal(engine.getStrikes(), 1);
  });

  it("should disqualify and terminate on Strike 3", () => {
    const engine = createProctoringEngine();

    engine.recordEvent("Strike 1", "BLUR", 1000);
    engine.recordEvent("Strike 2", "BLUR", 4000);
    const strike3 = engine.recordEvent("Strike 3", "BLUR", 7000);

    assert.equal(strike3.status, "TERMINATED");
    assert.equal(engine.getStrikes(), 3);
    assert.equal(engine.isDisqualified(), true);

    // Any subsequent events after termination should be rejected
    const afterTerm = engine.recordEvent("Subsequent event", "BLUR", 10000);
    assert.equal(afterTerm.status, "ALREADY_TERMINATED");
  });
});
