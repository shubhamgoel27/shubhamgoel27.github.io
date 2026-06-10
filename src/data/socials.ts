export interface Social {
  label: string;
  href: string;
  handle?: string;
}

export const socials = {
  github: { label: "GitHub", href: "https://github.com/shubhamgoel27", handle: "shubhamgoel27" },
  linkedin: { label: "LinkedIn", href: "https://linkedin.com/in/shubhamgoel27", handle: "in/shubhamgoel27" },
  twitter: { label: "X", href: "https://twitter.com/shubhamg_", handle: "@shubhamg_" },
  email: { label: "Email", href: "mailto:shubhamgoel27@gmail.com", handle: "shubhamgoel27@gmail.com" },
} satisfies Record<string, Social>;

export const socialOrder = ["github", "linkedin", "twitter", "email"] as const;
