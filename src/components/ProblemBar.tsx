"use client";

import { actions, useJumpIn } from "@/lib/store";
import { Icon } from "./Icon";

/** "Your profile didn't save…": shown whenever a save fails, until dismissed. */
export function ProblemBar() {
  const { problem } = useJumpIn();
  if (!problem) return null;
  return (
    <div className="problem-bar" role="alert">
      <Icon name="flag" size={17} />
      <span className="problem-bar__text">{problem}</span>
      <button className="problem-bar__close" onClick={() => actions.dismissProblem()} aria-label="Dismiss">
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
