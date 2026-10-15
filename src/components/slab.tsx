// The hero: a graded-card slab. The label carries the headline figure; the "cert number" is the
// gacha wallet that every figure on this page is read from, and the barcode is drawn from its bytes.

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function Barcode({ seed, width = 150, height = 26 }: { seed: string; width?: number; height?: number }) {
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (const ch of seed) {
    const v = B58.indexOf(ch);
    const w = 1 + (v % 3);
    const gap = 1 + ((v >> 2) % 2);
    if (x + w > width) break;
    bars.push({ x, w });
    x += w + gap;
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={height} fill="#16181d" />)}
    </svg>
  );
}

export default function Slab({ year, title, line2, grade, gradeSub, cert, certHref, children }: {
  year: string; title: string; line2: string; grade: string; gradeSub: string; cert: string; certHref: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="slab relative mx-auto w-full max-w-[460px] overflow-hidden rounded-[18px] p-3.5">
      <div className="slab-label cond rounded-[6px] px-3.5 pt-2.5 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 text-[13px] leading-[1.25] font-semibold tracking-wide uppercase">
            <div>{year} {title}</div>
            <div>{line2}</div>
            <div className="font-medium text-[#555a66]">
              Cert <a href={certHref} target="_blank" rel="noreferrer" className="underline decoration-[#c8202f]/50">{cert.slice(0, 6)}…{cert.slice(-4)}</a>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[34px] leading-none font-bold tracking-tight">{grade}</div>
            <div className="mt-1 text-[12px] font-semibold tracking-wide uppercase text-[#555a66]">{gradeSub}</div>
          </div>
        </div>
        <div className="mt-2 flex items-end justify-between">
          <Barcode seed={cert} />
          <span className="text-[11px] font-semibold tracking-[0.2em] text-label">ONCHAIN</span>
        </div>
      </div>
      <div className="relative mt-3 overflow-hidden rounded-[8px] border border-white/10 bg-[#0b0d11] p-4">
        {children}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent slab-sheen" />
    </figure>
  );
}
