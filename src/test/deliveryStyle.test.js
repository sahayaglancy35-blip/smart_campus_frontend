import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getDeliveryType, deliveryStyleOf, DELIVERY_STYLE } from "../components/common/deliveryStyle.js";

describe("deliveryStyle module", () => {
  it("should classify items with explicit delivery_type='LAB' as LAB", () => {
    const item = { delivery_type: "LAB", subject_name: "Computer Networks" };
    assert.equal(getDeliveryType(item), "LAB");
    assert.deepEqual(deliveryStyleOf(item), DELIVERY_STYLE.LAB);
  });

  it("should classify items with explicit subject_type='THEORY' as THEORY", () => {
    const item = { subject_type: "THEORY", subject_name: "Operating Systems" };
    assert.equal(getDeliveryType(item), "THEORY");
    assert.deepEqual(deliveryStyleOf(item), DELIVERY_STYLE.THEORY);
  });

  it("should detect lab keywords in subject_name when type field is absent", () => {
    const item = { subject_name: "Database Management Systems Laboratory" };
    assert.equal(getDeliveryType(item), "LAB");
  });

  it("should default to THEORY when no type or lab keywords are detected", () => {
    const item = { subject_name: "Discrete Mathematics" };
    assert.equal(getDeliveryType(item), "THEORY");
  });
});
