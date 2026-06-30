import { Chat } from "@/components/chat/Chat";

export default function Home() {
  return (
    <main className="crt-stage">
      <div className="relative z-20 flex h-full min-h-0 flex-col">
        <Chat />
      </div>

      <div className="crt-overlay crt-lines" aria-hidden />
      <div className="crt-overlay crt-vignette" aria-hidden />
      <div className="crt-overlay crt-noise" aria-hidden />
      <div className="crt-overlay crt-flicker" aria-hidden />
    </main>
  );
}
