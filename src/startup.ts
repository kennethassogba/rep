import {
  heatBlock,
  steamBlock,
  rpm,
  type State,
  type Controls,
} from "./physics.ts";
export const actions = ["cooling", "primary", "heat", "steam", "load"] as const;
export type Action = (typeof actions)[number];
export type Availability = {
  ready: boolean;
  active: boolean;
  requires?: Action;
};
export function controlValue(action: Action, c: Controls): number {
  return action === "cooling"
    ? c.cooling
    : action === "primary"
      ? c.primary
      : action === "heat"
        ? c.power
        : action === "steam"
          ? c.valve
          : Number(c.generator);
}
export function setControl(action: Action, value: number, c: Controls) {
  if (!Number.isFinite(value)) return;
  const v = Math.max(0, Math.min(1, value));
  if (action === "cooling") c.cooling = c.feed = v;
  if (action === "primary") c.primary = v;
  if (action === "heat") c.power = v;
  if (action === "steam") c.valve = v;
  if (action === "load") c.generator = v >= 0.5;
}
// Commands are always available. Prerequisites describe the physical response,
// never disable a handle: an open cold valve simply has no steam to admit.
export function availability(
  action: Action,
  s: State,
  c: Controls,
): Availability {
  const active = controlValue(action, c) > 0;
  let requires: Action | undefined;
  if (action === "heat" && heatBlock(s))
    requires =
      s.coolingFlow < 0.25 || s.feedFlow < 0.25 ? "cooling" : "primary";
  if (action === "steam" && steamBlock(s))
    requires = s.feedFlow < 0.25 || s.condenserT > 75 ? "cooling" : "heat";
  if (action === "load" && rpm(s) < 400) requires = "steam";
  return { ready: true, active, requires };
}
export function operate(action: Action, s: State, c: Controls): Availability {
  const status = availability(action, s, c);
  setControl(
    action,
    status.active ? 0 : action === "heat" ? 0.65 : action === "steam" ? 0.7 : 1,
    c,
  );
  return status;
}
export function nextAction(s: State, c: Controls): Action | undefined {
  return actions.find((a) => !availability(a, s, c).active);
}
export const actionEquipment = {
  cooling: "cooling",
  primary: "primary",
  heat: "reactor",
  steam: "turbine",
  load: "generator",
} as const;
