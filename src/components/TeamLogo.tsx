import { useState } from "react";

interface TeamLogoProps {
  teamId: number | null;
  teamName: string;
  size?: number;
}

// Bzzoiro's image proxy serves team crests with transparent backgrounds and
// 365-day cache. No token required, so we can hit it directly from the browser.
export function TeamLogo({ teamId, teamName, size = 48 }: TeamLogoProps) {
  const [failed, setFailed] = useState(false);
  const initials = teamName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  if (teamId == null || failed) {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground"
        style={{ width: size, height: size, fontSize: size * 0.32 }}
        aria-label={teamName}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={`https://sports.bzzoiro.com/img/team/${teamId}/?bg=transparent`}
      alt={`${teamName} crest`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className="object-contain"
    />
  );
}
