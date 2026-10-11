// A number that counts up when scrolled into view (Magic UI Number Ticker). Screen readers get the
// final value straight away; the animated digits are hidden from them.

import { NumberTicker } from "@/components/magicui/number-ticker";

export default function Ticker({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  delay = 0,
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  delay?: number;
  className?: string;
}) {
  return (
    <span className={className}>
      <span className="sr-only">{`${prefix}${value.toFixed(decimals)}${suffix}`}</span>
      <span aria-hidden className="whitespace-nowrap">
        {prefix}
        <NumberTicker value={value} decimalPlaces={decimals} delay={delay} />
        {suffix}
      </span>
    </span>
  );
}
