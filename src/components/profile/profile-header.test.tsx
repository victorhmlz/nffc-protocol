import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Profile } from "@domain/profile/profile";
import { ProfileHeader } from "@/components/profile/profile-header";

const ADDRESS = "0x1111111111111111111111111111111111aaaa";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    address: ADDRESS,
    created: [],
    owned: [],
    listed: [],
    collections: [],
    recentActivity: [],
    ...overrides,
  };
}

describe("ProfileHeader", () => {
  it("shows the truncated address", () => {
    render(<ProfileHeader profile={profile()} />);
    expect(screen.getByText("0x1111…aaaa")).toBeInTheDocument();
  });

  it("shows a neutral badge when there is no on-chain activity", () => {
    render(<ProfileHeader profile={profile()} />);
    expect(screen.getByText(/no on-chain activity yet/i)).toBeInTheDocument();
  });

  it("shows a Creator badge only when the wallet has created something", () => {
    render(<ProfileHeader profile={profile({ created: [{} as never] })} />);
    expect(screen.getByText("Creator")).toBeInTheDocument();
    expect(screen.queryByText(/no on-chain activity/i)).not.toBeInTheDocument();
  });

  it("shows a Collector badge only when the wallet owns something", () => {
    render(<ProfileHeader profile={profile({ owned: [{} as never] })} />);
    expect(screen.getByText("Collector")).toBeInTheDocument();
  });

  it("shows both badges when the wallet is both a creator and a collector", () => {
    render(<ProfileHeader profile={profile({ created: [{} as never], owned: [{} as never] })} />);
    expect(screen.getByText("Creator")).toBeInTheDocument();
    expect(screen.getByText("Collector")).toBeInTheDocument();
  });
});
