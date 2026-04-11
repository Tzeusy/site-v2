import test from "node:test";
import assert from "node:assert/strict";
import React from "react";

import { extractHeadingsFromNode } from "./blog-headings.ts";

test("extracts visible text and rendered ids from heading children", () => {
  const tree = React.createElement(
    React.Fragment,
    null,
    React.createElement("h2", { id: "overview" }, "Overview"),
    React.createElement(
      "h3",
      { id: "jevons-paradox-is-almost-a-certainty" },
      React.createElement(
        "a",
        { href: "https://en.wikipedia.org/wiki/Jevons_paradox" },
        "Jevons Paradox",
      ),
      " is almost a certainty",
    ),
  );

  assert.deepEqual(extractHeadingsFromNode(tree), [
    { level: 2, text: "Overview", id: "overview" },
    {
      level: 3,
      text: "Jevons Paradox is almost a certainty",
      id: "jevons-paradox-is-almost-a-certainty",
    },
  ]);
});
