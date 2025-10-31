"use client";

import * as codables from "../../../codables";

import { useEffect } from "react";

export function GlobalStylings() {
  useEffect(() => {
    Reflect.set(window, "codables", Object.fromEntries(Object.entries(codables)));

    import("superjson")
      .then(({ default: superjson }) => {
        Reflect.set(window, "superjson", Object.fromEntries(Object.entries(superjson)));
      })
      .catch(() => {});
  });
  return null;
}
