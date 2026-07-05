// Tiny pixel-person avatar (hair cap + skin face + colored body with a dark
// outline), after the sprite construction in docs/design/Pixel Village.dc.html.
// Pure CSS divs — no assets. Online villagers bob gently (staggered via
// delayMs); offline villagers stand still and dim.

export type VillagerAvatarProps = {
  /** CSS color for the body (villager.color from the API). */
  body: string;
  /** CSS color for the hair cap (derive with villagerHair from defs.ts). */
  hair: string;
  online: boolean;
  /** Staggers the bob so a crowd doesn't move in lockstep. */
  delayMs?: number;
};

export function VillagerAvatar({ body, hair, online, delayMs = 0 }: VillagerAvatarProps) {
  return (
    <span className={online ? 'omd-va' : 'omd-va omd-va--off'} aria-hidden="true">
      <span
        className="omd-va-sprite"
        style={online && delayMs !== 0 ? { animationDelay: `${delayMs}ms` } : undefined}
      >
        <span className="omd-va-hair" style={{ background: hair }} />
        <span className="omd-va-face" />
        <span className="omd-va-body" style={{ background: body }} />
      </span>
      <span className="omd-va-shadow" />
    </span>
  );
}
