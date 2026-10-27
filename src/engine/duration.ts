/** Modified duration of an annual par bond. Chan, Guo, Lee, and Li, chapter 3.5. */
export function modifiedDuration(yieldAnnual: number, years: number): number {
  if (yieldAnnual <= 0 || years <= 0) return 0;
  return (1 / yieldAnnual) * (1 - (1 + yieldAnnual) ** -years);
}

/** Carry minus duration times the yield change. An approximation, not a traded total return. */
export function scenarioReturn(
  yieldAnnual: number,
  years: number,
  yieldChange: number,
  yearFraction: number,
): number {
  return yieldAnnual * yearFraction - modifiedDuration(yieldAnnual, years) * yieldChange;
}
