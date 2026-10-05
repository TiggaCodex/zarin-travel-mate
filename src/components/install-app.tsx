import { useEffect, useState } from "react";
import { Download, Globe, Monitor, Share, Smartphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "zarin-install-dismissed";

type Platform = "ios" | "android" | "desktop";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

const STEPS: Record<Platform, { title: string; description: string; steps: string[] }> = {
  ios: {
    title: "Add Zarin to your Home Screen",
    description: "In Safari on iPhone or iPad:",
    steps: [
      "Tap the Share button (the square with an arrow) in the Safari toolbar.",
      "Scroll down and tap Add to Home Screen.",
      "Tap Add. Open Zarin from its new Home Screen icon.",
    ],
  },
  android: {
    title: "Install Zarin on your phone",
    description: "In Chrome on Android:",
    steps: [
      "Tap the ⋮ menu at the top right of Chrome.",
      "Tap Install app (or Add to Home screen).",
      "Confirm. Open Zarin from its new Home Screen icon.",
    ],
  },
  desktop: {
    title: "Install Zarin on your computer",
    description: "In Edge or Chrome on Windows:",
    steps: [
      "Click the install icon that appears at the right end of the address bar.",
      "If you don't see it, open the browser menu (⋯ or ⋮) and choose Apps, then Install this site as an app.",
      "Zarin opens in its own window and gets its own Start menu icon.",
    ],
  },
};

export function InstallApp({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [hidden, setHidden] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setPlatform(detectPlatform());
    if (isStandalone() || localStorage.getItem(DISMISS_KEY) === "1") return;
    setHidden(false);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setHidden(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden || installed) return null;

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setHidden(true);
      setDeferred(null);
      return;
    }
    setShowHelp(true);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
  }

  const steps = STEPS[platform];
  const StepIcon = platform === "ios" ? Share : platform === "android" ? Smartphone : Monitor;

  return (
    <>
      <div className={className}>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-10 flex-1 justify-start" onClick={install}>
            <Download className="size-4" /> Install Zarin
          </Button>
          <Button variant="ghost" size="icon" className="size-10" aria-label="Hide install option" onClick={dismiss}>
            <X className="size-4" />
          </Button>
        </div>
      </div>
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{steps.title}</DialogTitle>
            <DialogDescription>
              {deferred ? "Zarin can be installed on this device." : steps.description}
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {steps.steps.map((step, i) => (
              <li key={i}>
                {i === 0 && platform === "ios" ? (
                  <>
                    Tap the Share button <Share className="inline size-4" /> in the Safari toolbar — scroll down and
                    tap <strong>Add to Home Screen</strong>.
                  </>
                ) : (
                  step
                )}
              </li>
            ))}
          </ol>
          <p className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <StepIcon className="mt-0.5 size-4 shrink-0" />
            <span>
              {platform === "ios"
                ? "iPhone and iPad don't show an automatic install button — Safari's Add to Home Screen is the way to install."
                : platform === "android"
                  ? "If you don't see the install option, make sure you're using Chrome and visiting the published Zarin site."
                  : "Zarin installs as a desktop app that opens in its own window, separate from the browser."}
            </span>
          </p>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Globe className="size-3.5" />
            Installation works in the published app — not inside previews or other embedded frames.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
