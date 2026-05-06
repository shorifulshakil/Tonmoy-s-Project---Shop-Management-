export const fmtBDT = (n: number) =>
  `BDT ${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export const fmtBDTk = (n: number) =>
  `BDT ${(Number(n || 0) / 1000).toLocaleString("en-IN", { maximumFractionDigits: 1 })}k`;
