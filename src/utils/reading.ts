import getReadingTime from "reading-time";

export function minutesRead(body: string | undefined): number {
  if (!body) return 1;
  return Math.max(1, Math.round(getReadingTime(body).minutes));
}
