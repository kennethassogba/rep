import {
  heatBlock,
  steamBlock,
  rpm,
  rates,
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
export function availability(
  action: Action,
  s: State,
  c: Controls,
): Availability {
  const active =
    action === "cooling"
      ? c.cooling > 0
      : action === "primary"
        ? c.primary > 0
        : action === "heat"
          ? c.power > 0
          : action === "steam"
            ? c.valve > 0
            : c.generator;
  if (active) return { ready: true, active };
  if (action === "primary" && (s.coolingFlow < 0.75 || s.feedFlow < 0.75))
    return { ready: false, active, requires: "cooling" };
  if (action === "heat" && heatBlock(s))
    return {
      ready: false,
      active,
      requires:
        s.coolingFlow < 0.25 || s.feedFlow < 0.25 ? "cooling" : "primary",
    };
  if (action === "steam" && steamBlock(s))
    return {
      ready: false,
      active,
      requires: s.feedFlow < 0.25 || s.condenserT > 75 ? "cooling" : "heat",
    };
  if (action === "load" && (rpm(s) < 400 || rates(s, c).admitted < 1))
    return { ready: false, active, requires: "steam" };
  return {
    ready: !s.outsideModel || action === "cooling" || action === "primary",
    active,
  };
}
export function operate(action: Action, s: State, c: Controls): Availability {
  const status = availability(action, s, c);
  if (!status.ready) return status;
  if (action === "cooling") c.cooling = c.feed = status.active ? 0 : 1;
  if (action === "primary") c.primary = status.active ? 0 : 1;
  if (action === "heat") c.power = status.active ? 0 : 0.65;
  if (action === "steam") c.valve = status.active ? 0 : 0.7;
  if (action === "load") c.generator = !c.generator;
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
