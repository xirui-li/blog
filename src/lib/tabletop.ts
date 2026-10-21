// Tiny animation helpers for the tabletop figures (InstructionPlayground,
// InContextDemo): a gripper that picks a cup and places it somewhere.

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Animate numbers from `from` to `to`, calling `apply` each frame. */
export function tween(from: number[], to: number[], ms: number, apply: (v: number[]) => void) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  return new Promise<void>((resolve) => {
    if (reduced) {
      apply(to);
      return resolve();
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const k = ease(t);
      apply(from.map((f, i) => f + (to[i] - f) * k));
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

export const place = (el: Element, x: number, y: number) => el.setAttribute('transform', `translate(${x} ${y})`);

/**
 * A scene with a gripper (palm at its origin) and cups (base at their origin).
 * `pick` moves one cup to a target, carrying it in the gripper.
 */
export class Tabletop {
  private gripper: [number, number];
  private cups = new Map<Element, [number, number]>();
  private token = 0;

  constructor(
    private gripperEl: Element,
    private rest: [number, number],
    private lift = 110,
  ) {
    this.gripper = [...rest];
    place(gripperEl, ...rest);
  }

  addCup(el: Element, x: number, y: number) {
    this.cups.set(el, [x, y]);
    place(el, x, y);
    (el as SVGElement).style.opacity = '1';
  }

  /** Cancel any running sequence and put everything back. */
  reset(home: Map<Element, [number, number]>) {
    this.token++;
    for (const [el, [x, y]] of home) this.addCup(el, x, y);
    this.gripper = [...this.rest];
    place(this.gripperEl, ...this.rest);
  }

  private async moveGripper(x: number, y: number, ms: number, carry?: Element) {
    const [gx, gy] = this.gripper;
    await tween([gx, gy], [x, y], ms, ([nx, ny]) => {
      place(this.gripperEl, nx, ny);
      if (carry) {
        place(carry, nx, ny + 62);
        this.cups.set(carry, [nx, ny + 62]);
      }
    });
    this.gripper = [x, y];
  }

  /** Returns false if cancelled by a reset. */
  async pick(cup: Element, tx: number, ty: number) {
    const token = this.token;
    const live = () => token === this.token;
    const [cx, cy] = this.cups.get(cup)!;
    await this.moveGripper(cx, this.lift, 450);
    if (!live()) return false;
    await this.moveGripper(cx, cy - 62, 450);
    if (!live()) return false;
    await sleep(150);
    await this.moveGripper(cx, this.lift, 400, cup);
    if (!live()) return false;
    await this.moveGripper(tx, this.lift, 650, cup);
    if (!live()) return false;
    await this.moveGripper(tx, ty - 62, 400, cup);
    if (!live()) return false;
    await sleep(150);
    await this.moveGripper(...this.rest, 500);
    return live();
  }
}
