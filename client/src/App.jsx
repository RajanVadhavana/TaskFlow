import React, { useState } from "react";
import BoardPage from "./components/BoardPage.jsx";
import ComponentDemo from "./components/ComponentDemo.jsx";

/**
 * App
 *
 * Simple top-level router.  We use a query-string flag (?demo) to show the
 * component demo page during development without touching the board.
 * In production this URL is never linked anywhere.
 */
export default function App() {
  const isDemo = new URLSearchParams(window.location.search).has("demo");
  return isDemo ? <ComponentDemo /> : <BoardPage />;
}
