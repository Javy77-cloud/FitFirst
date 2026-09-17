/** Lean upcoming list. Not a voting board, heatmap, or BI product. */

export type DeveloperNote = {
  id: string;
  title: string;
  body: string;
  when: "later";
};

export const DEVELOPER_UPCOMING: readonly DeveloperNote[] = [
  {
    id: "feature-heat",
    title: "Feature-request heat",
    body: "Later — rank incoming requests by repeats. Not a voting board in this starter.",
    when: "later",
  },
  {
    id: "errors",
    title: "Error watch",
    body: "Later — production error rollup for site developers. No fake error counts here.",
    when: "later",
  },
  {
    id: "revenue-bi",
    title: "Revenue BI",
    body: "Later — bind / premium analytics. Out of scope for this hub.",
    when: "later",
  },
];
