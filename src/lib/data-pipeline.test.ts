import { describe, expect, it } from "vitest";
import { isFinishedStatus } from "./data-pipeline";

describe("isFinishedStatus", () => {
  it.each(["Match Finished", "finished", "FT", "ft", "AET", "PEN", "Full Time", "fulltime"])(
    "detecta encerrado: %s",
    (s) => {
      expect(isFinishedStatus(s)).toBe(true);
    },
  );

  it.each([
    "Not Started",
    "notstarted",
    "1H",
    "2H",
    "HT",
    "1st_half",
    "inprogress",
    "",
    null,
    undefined,
  ])("não marca como encerrado: %s", (s) => {
    expect(isFinishedStatus(s)).toBe(false);
  });
});
