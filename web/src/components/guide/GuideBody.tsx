"use client";

// The guide's body: reads the public gateway URL from /api/guide-config at runtime, shows it,
// and hands it to every section so commands and configs are ready to paste.

import { useEffect, useState } from "react";
import { LocalMark } from "@/components/Markers";
import { CopyButton } from "./CodeBlock";
import Links from "./Links";
import McpSetup from "./McpSetup";
import OwnApp from "./OwnApp";
import SelfHost from "./SelfHost";
import Toc from "./Toc";
import TrainJudge from "./TrainJudge";
import Troubleshooting from "./Troubleshooting";
import WhatItIs from "./WhatItIs";

export const LOCAL_GATEWAY = "http://localhost:8000";

type Config = { loaded: boolean; live: string | null };

function GatewayBanner({ config }: { config: Config }) {
  if (!config.loaded) {
    return (
      <p className="label-mono border border-rule-strong px-4 py-3" role="status">
        Checking for a live demo gateway…
      </p>
    );
  }
  if (config.live) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border border-local border-l-4 px-4 py-2.5">
        <div className="flex min-w-0 flex-col gap-1 py-1">
          <span className="label-mono inline-flex items-center gap-2 text-local">
            <LocalMark className="blink-soft text-local" /> Live demo gateway
          </span>
          <span className="break-all font-mono text-sm font-semibold text-local">{config.live}</span>
        </div>
        <CopyButton text={config.live} label="gateway URL" />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1 border border-rule-strong border-l-4 border-l-ink px-4 py-3">
      <span className="label-mono">Gateway URL</span>
      <span className="text-sm text-body">
        Commands below use <span className="font-mono font-semibold text-local">{LOCAL_GATEWAY}</span>. Replace it with
        your gateway&apos;s URL if it runs elsewhere.
      </span>
    </div>
  );
}

export default function GuideBody() {
  const [config, setConfig] = useState<Config>({ loaded: false, live: null });

  useEffect(() => {
    let alive = true;
    fetch("/api/guide-config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { gatewayUrl: null }))
      .then((d: { gatewayUrl?: string | null }) => {
        if (alive) setConfig({ loaded: true, live: d.gatewayUrl || null });
      })
      .catch(() => {
        if (alive) setConfig({ loaded: true, live: null });
      });
    return () => {
      alive = false;
    };
  }, []);

  const gw = config.live ?? LOCAL_GATEWAY;

  return (
    <div className="grid gap-x-12 pt-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <Toc />
      <div className="min-w-0">
        <div>
          <GatewayBanner config={config} />
        </div>
        <WhatItIs />
        <McpSetup gw={gw} live={config.live !== null} />
        <OwnApp gw={gw} />
        <SelfHost />
        <TrainJudge />
        <Troubleshooting gw={gw} />
        <Links />
      </div>
    </div>
  );
}
