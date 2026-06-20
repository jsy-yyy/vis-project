export type CShapesSnapshot = {
  date: string;
  year: number;
  label: string;
};

export type ResolvedCShapesSnapshot = CShapesSnapshot & {
  requestedYear: number;
};

export const cshapesSnapshots: CShapesSnapshot[] = [
  { date: "1890-07-01", year: 1890, label: "1890" },
  { date: "1900-07-01", year: 1900, label: "1900" },
  { date: "1910-07-01", year: 1910, label: "1910" },
  { date: "1914-08-01", year: 1914, label: "1914" },
  { date: "1918-11-11", year: 1918, label: "1918" },
  { date: "1920-07-01", year: 1920, label: "1920" },
  { date: "1930-07-01", year: 1930, label: "1930" },
  { date: "1939-09-01", year: 1939, label: "1939" },
  { date: "1940-07-01", year: 1940, label: "1940" },
  { date: "1945-05-08", year: 1945, label: "1945" },
  { date: "1950-07-01", year: 1950, label: "1950" },
  { date: "1960-07-01", year: 1960, label: "1960" },
  { date: "1970-07-01", year: 1970, label: "1970" },
  { date: "1980-07-01", year: 1980, label: "1980" },
  { date: "1990-07-01", year: 1990, label: "1990" },
  { date: "1991-12-25", year: 1991, label: "1991" },
  { date: "2000-07-01", year: 2000, label: "2000" },
  { date: "2003-07-01", year: 2003, label: "2003" },
];

export function resolveCShapesSnapshot(requestedYear: number): ResolvedCShapesSnapshot {
  const snapshot = cshapesSnapshots.reduce((latest, candidate) => {
    if (candidate.year > requestedYear) {
      return latest;
    }

    return candidate.year > latest.year ? candidate : latest;
  }, cshapesSnapshots[0]);

  return {
    ...snapshot,
    requestedYear,
  };
}
