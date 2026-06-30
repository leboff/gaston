"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { LoginScreen } from "@/components/LoginScreen";
import { Sidebar } from "@/components/Sidebar";
import { ChatView } from "@/components/ChatView";
import { TopBar } from "@/components/TopBar";
import { Settings } from "@/components/Settings";

export default function Home() {
  const me = useStore((s) => s.me);
  const bootstrap = useStore((s) => s.bootstrap);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (me === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center text-black/50 dark:text-white/50">
        Loading…
      </div>
    );
  }

  if (me === null) return <LoginScreen />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar
        onOpenSettings={() => setShowSettings(true)}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <ChatView />
      </div>
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}
