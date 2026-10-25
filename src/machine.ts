// Registered animation layers share the illustration's 1024 x 1536 coordinates.
export class Machine {
  constructor(public host: HTMLElement) {
    host.setAttribute("role", "img");
    host.setAttribute("aria-label", "Power machine with the Élysée palace");
    host.innerHTML = `<div class="machine-art"><img class="machine-base" src="/art/machine.webp" alt="" fetchpriority="high"><svg class="machine-layers" viewBox="0 0 1024 1536" aria-hidden="true"><defs><clipPath id="core-mask"><ellipse cx="435" cy="851" rx="158" ry="168"/></clipPath><clipPath id="palace-mask"><path d="M278 38H825V280H278Z"/></clipPath><clipPath id="rotor-a"><ellipse cx="425" cy="504" rx="51" ry="74"/></clipPath><clipPath id="rotor-b"><ellipse cx="549" cy="504" rx="49" ry="73"/></clipPath></defs><image id="palace-art" href="/art/machine.webp" width="1024" height="1536" clip-path="url(#palace-mask)"/><image id="core-art" href="/art/machine.webp" width="1024" height="1536" clip-path="url(#core-mask)"/><g clip-path="url(#rotor-a)"><image id="rotor-first" href="/art/machine.webp" width="1024" height="1536"/></g><g clip-path="url(#rotor-b)"><image id="rotor-second" href="/art/machine.webp" width="1024" height="1536"/></g><path class="water-flow" d="M76 530Q56 580 61 650L61 1010Q62 1064 118 1068L169 1068Q230 1070 235 1160L235 1250Q237 1304 315 1310"/><path class="current-flow" d="M950 683L964 408Q967 173 797 143"/></svg><div class="steam-cloud steam-one"></div><div class="steam-cloud steam-two"></div></div>`;
  }
  angle = 0;
  update(completed: number, dt: number) {
    this.host.dataset.stage = String(completed);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (completed >= 2 && !reduced) this.angle = (this.angle + dt * 150) % 360;
    this.host
      .querySelector("#rotor-first")!
      .setAttribute("transform", `rotate(${this.angle} 425 504)`);
    this.host
      .querySelector("#rotor-second")!
      .setAttribute("transform", `rotate(${-this.angle} 549 504)`);
  }
}
