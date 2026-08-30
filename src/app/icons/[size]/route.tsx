import { ImageResponse } from "next/og";

// Serves /icons/192  and  /icons/512  for the PWA manifest
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeStr } = await params;
  const size = Number(sizeStr);

  if (![192, 512].includes(size)) {
    return new Response("Not found", { status: 404 });
  }

  const radius = Math.round(size * 0.18);
  const iconSize = Math.round(size * 0.6);

  return new ImageResponse(
    <div
      style={{
        width: size,
        height: size,
        background: "#1e3a8a",
        borderRadius: radius,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="white">
        <path d="M21 16v-2l-8-5V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
      </svg>
    </div>,
    { width: size, height: size }
  );
}
