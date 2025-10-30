"use client";

import * as codables from "../../../codables";

import { useEffect } from "react";

export function GlobalStylings() {
  useEffect(() => {
    Reflect.set(window, "codables", Object.freeze(Object.entries(codables)));
  });
  return null;
}
