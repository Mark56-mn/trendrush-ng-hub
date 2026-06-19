import { MessageCircle } from "lucide-react";

export function WhatsAppFab({ link }: { link?: string | null }) {
  const href = link && link.trim().length > 0 ? link : "https://wa.me/2348000000000";
  const url = new URL(href);
  if (!url.searchParams.get("text")) {
    url.searchParams.set("text", "Hello, I want to ask about this product");
  }
  return (
    <a
      href={url.toString()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-emerald-500/40 transition hover:scale-105"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
