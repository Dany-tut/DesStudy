/**
 * Animated brand mark: four rounded blocks that pulse
 * 4 squares → 2 vertical bars → 4 → 2 horizontal bars → loop.
 * Geometry & keyframes live in globals.css (.brand-logo). Size is driven
 * by the --u unit var: box = 48 * --u. Default 24px mark (--u: 0.5px).
 */
export function BrandLogo({ size = 24 }: { size?: number }) {
  const u = size / 48;
  return (
    <span
      className="brand-logo"
      aria-hidden
      style={{ ['--u' as string]: `${u}px`, width: size, height: size, display: 'inline-block' }}
    >
      <i className="bl1" />
      <i className="bl2" />
      <i className="bl3" />
      <i className="bl4" />
    </span>
  );
}
