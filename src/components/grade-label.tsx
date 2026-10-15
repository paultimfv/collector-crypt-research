// Small brand touch: the headline figure styled like a graded-card label.
// The "cert" is the gacha wallet every figure is read from; the barcode is drawn from its characters.

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function Barcode({ seed, width = 120, height = 18 }: { seed: string; width?: number; height?: number }) {
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (const ch of seed) {
    const v = B58.indexOf(ch);
    const w = 1 + (v % 3);
    if (x + w > width) break;
    bars.push({ x, w });
    x += w + 1 + ((v >> 2) % 2);
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={height} fill="#1a1c21" />)}
    </svg>
  );
}

export default function GradeLabel({ top, line2, grade, gradeSub, cert }: { top: string; line2: string; grade: string; gradeSub: string; cert: string }) {
  return (
    <a href={`https://solscan.io/account/${cert}`} target="_blank" rel="noreferrer"
      className="block w-[340px] shrink-0 rounded-md border-[3px] border-[#c8202f] bg-[#f6f3ec] px-3 py-2 text-[#1a1c21] no-underline">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11.5px] font-semibold leading-[1.3] tracking-wide uppercase">
          <div>{top}</div>
          <div>{line2}</div>
          <div className="font-medium text-[#5b606b]">Cert {cert.slice(0, 6)}…{cert.slice(-4)}</div>
        </div>
        <div className="shrink-0 whitespace-nowrap text-right">
          <div className="text-[24px] font-bold leading-none">{grade}</div>
          <div className="mt-1 text-[10.5px] font-semibold tracking-wide uppercase text-[#5b606b]">{gradeSub}</div>
        </div>
      </div>
      <div className="mt-1.5"><Barcode seed={cert} /></div>
    </a>
  );
}
