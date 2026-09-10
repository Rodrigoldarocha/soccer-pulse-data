import { describe, expect, it } from "vitest";
import { buildTeamLogoMap, findLogo, applyLogos } from "./team-logos";
import { teamMonogram } from "./team-monogram";
import type { MatchPrediction } from "./types";

const teams = [
  { id: "1", name: "Atletico Mineiro", short: "Atletico MG", abbrev: "CAM", logo: "http://a/cam" },
  { id: "2", name: "Manchester United", short: "Man Utd", abbrev: "MNU", logo: "http://a/mnu" },
];

describe("team crest matching", () => {
  const map = buildTeamLogoMap(teams);

  it("casa apelido com o nome canônico", () => {
    expect(findLogo("Atlético-MG", map)).toBe("http://a/cam");
    expect(findLogo("Man United", map)).toBe("http://a/mnu");
  });

  it("casa nome completo com acento", () => {
    expect(findLogo("Manchester United FC", map)).toBe("http://a/mnu");
  });

  it("sem match retorna null", () => {
    expect(findLogo("Time Inexistente XYZ", map)).toBeNull();
  });

  it("applyLogos limpa placeholders não-URL", () => {
    const match = {
      home: { name: "Atletico MG", logo: "⚽" },
      away: { name: "Time Inexistente XYZ", logo: "⚽" },
    } as unknown as MatchPrediction;
    const [out] = applyLogos([match], map);
    expect(out.home.logo).toBe("http://a/cam");
    expect(out.away.logo).toBe("");
  });
});

describe("teamMonogram", () => {
  it("usa iniciais das duas primeiras palavras", () => {
    expect(teamMonogram("Real Madrid").initials).toBe("RM");
  });

  it("ignora sufixos e usa 3 letras em nome único", () => {
    expect(teamMonogram("Palmeiras FC").initials).toBe("PAL");
  });

  it("cor é estável para o mesmo nome", () => {
    expect(teamMonogram("Flamengo").hue).toBe(teamMonogram("Flamengo").hue);
  });
});
