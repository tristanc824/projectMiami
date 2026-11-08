import React from "react";

/*
 * Twelve grocery line icons for the inflation scene: one 24-unit grid, one stroke weight, round
 * caps and joins, no fills. Order = reading order of the 4x3 grid.
 */

const P = (d: string) => <path d={d} />;

export const GROCERIES: { name: string; draw: React.ReactNode }[] = [
  {
    name: "bread",
    draw: (
      <>
        {P("M4.5 12.5c-1.1-.5-1.5-1.6-1.5-2.6C3 7.7 6.9 6 12 6s9 1.7 9 3.9c0 1-.4 2.1-1.5 2.6V18a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1Z")}
        {P("M9 9.5l1.2 2.2M12.4 9.2l1.2 2.2M15.8 9.5 17 11.7")}
      </>
    ),
  },
  {
    name: "milk",
    draw: (
      <>
        {P("M8.5 3h7v2.6l2 3V20a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V8.6l2-3Z")}
        {P("M6.5 9.5h11M8.5 5.6h7")}
        {P("M10 14.5c0-1.4 2-3.2 2-3.2s2 1.8 2 3.2a2 2 0 0 1-4 0Z")}
      </>
    ),
  },
  {
    name: "eggs",
    draw: (
      <>
        {P("M9 20.5c-2.9 0-5-2.2-5-5.3C4 11.6 6.4 7 9 7s5 4.6 5 8.2c0 3.1-2.1 5.3-5 5.3Z")}
        {P("M14.4 9.6C15 7.4 16 5.5 17 5.5c1.9 0 3.5 3.6 3.5 6.4 0 2.4-1.3 4.1-3.3 4.5")}
      </>
    ),
  },
  {
    name: "rice",
    draw: (
      <>
        {P("M3.5 12h17a8.5 8.5 0 0 1-17 0Z")}
        {P("M6.5 12c.4-2.6 2.7-4.5 5.5-4.5s5.1 1.9 5.5 4.5")}
        {P("M10 9.4l.4.7M13.4 9.2l-.3.8M11.8 10.6v.6")}
        {P("M15 4.5 19.5 9M17.5 3.5 21 7")}
      </>
    ),
  },
  {
    name: "coffee",
    draw: (
      <>
        {P("M4.5 10h11v5.5a4.5 4.5 0 0 1-4.5 4.5h-2a4.5 4.5 0 0 1-4.5-4.5Z")}
        {P("M15.5 11.5h1.3a2.3 2.3 0 0 1 0 4.6h-1.6")}
        {P("M8 3.5c-.9.9.9 1.9 0 3M11.5 3.5c-.9.9.9 1.9 0 3")}
      </>
    ),
  },
  {
    name: "apples",
    draw: (
      <>
        {P("M12 8.2c-1.4-1-4.6-1.3-6 .9-1.6 2.5-1 6.6 1 9.3 1.4 1.9 3 2.3 5 1.4 2 .9 3.6.5 5-1.4 2-2.7 2.6-6.8 1-9.3-1.4-2.2-4.6-1.9-6-.9Z")}
        {P("M12 8.2c0-2 .8-3.6 2.4-4.7")}
        {P("M12.6 5.4c1.6-.2 3 .2 3.9 1.2-1.4.6-2.8.6-3.9-.2")}
      </>
    ),
  },
  {
    name: "cheese",
    draw: (
      <>
        {P("M3 17.5 12.5 7l8.5 5v6.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z")}
        {P("M3 17.5h18")}
        <circle cx={9} cy={14.6} r={1.1} />
        <circle cx={15.5} cy={13.6} r={1} />
      </>
    ),
  },
  {
    name: "pasta",
    draw: (
      <>
        {P("M4 7.5 10 10.6v2.8L4 16.5c-.8-3-.8-6 0-9Z")}
        {P("M20 7.5 14 10.6v2.8l6 3.1c.8-3 .8-6 0-9Z")}
        {P("M10 10.6h4v2.8h-4Z")}
        {P("M6.3 9.4c.4 1.7.4 3.5 0 5.2M17.7 9.4c-.4 1.7-.4 3.5 0 5.2")}
      </>
    ),
  },
  {
    name: "beans",
    draw: (
      <>
        {P("M5.5 6.5h13v13a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5Z")}
        {P("M5 4h14v2.5H5Z")}
        {P("M9.6 11.6c1.1-.9 2.9-.6 3.4.6.4 1-.3 1.6.4 2.4.6.8.1 1.9-1.1 2.1-1.6.3-3.4-.7-3.7-2.3-.2-1.1.2-2.1 1-2.8Z")}
      </>
    ),
  },
  {
    name: "oil",
    draw: (
      <>
        {P("M10 2.5h4v3l2 2.6V20a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V8.1l2-2.6Z")}
        {P("M9.5 5.5h5")}
        {P("M12 11c1.2 1.5 1.9 2.6 1.9 3.6a1.9 1.9 0 0 1-3.8 0c0-1 .7-2.1 1.9-3.6Z")}
      </>
    ),
  },
  {
    name: "tomatoes",
    draw: (
      <>
        {P("M12 7.6c4.4 0 7.5 2.9 7.5 6.5S16.4 20.5 12 20.5 4.5 17.7 4.5 14.1 7.6 7.6 12 7.6Z")}
        {P("M9 6.8l3 1.8 3-1.8M12 8.6V4.5")}
      </>
    ),
  },
  {
    name: "chicken",
    draw: (
      <>
        {P("M13.6 4c3.6 0 6.4 2.8 6.4 6.3 0 2.6-1.6 4.7-3.9 5.6-1.5.6-3 .3-4 1.3L9.6 19.7")}
        {P("M13.6 4c-3.5 0-6.3 2.7-6.3 6.2 0 1.5.6 2.8 1.6 3.8L7 16")}
        {P("M7 16l2.6 3.7M6.2 15.2a1.6 1.6 0 1 0-2 2.2 1.6 1.6 0 1 0 2.3 2.1 1.6 1.6 0 1 0 2-2.2")}
      </>
    ),
  },
];

/** One icon, line-drawn. */
export const GroceryIcon = ({ i, size = 56, color = "#2F5D3A", strokeWidth = 1.6 }: { i: number; size?: number; color?: string; strokeWidth?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: "block", overflow: "visible" }}>
    <g fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {GROCERIES[i].draw}
    </g>
  </svg>
);
