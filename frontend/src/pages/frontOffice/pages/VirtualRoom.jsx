import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function buildJitsiUrl(roomSlug) {
  const base = "https://meet.jit.si";
  const room = encodeURIComponent(roomSlug);
  const params = new URLSearchParams({
    "config.prejoinPageEnabled": "false",
    "config.requireDisplayName": "false",
    "config.disableDeepLinking": "true",
  });
  return `${base}/${room}#${params.toString()}`;
}

export default function VirtualRoom() {
  const navigate = useNavigate();
  const { roomSlug } = useParams();
  const [copied, setCopied] = useState(false);

  const roomUrl = useMemo(() => {
    if (!roomSlug) return "";
    return buildJitsiUrl(roomSlug);
  }, [roomSlug]);

  useEffect(() => {
    setCopied(false);
  }, [roomSlug]);

  if (!roomSlug) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className="text-lg font-semibold">Missing room</p>
          <p className="text-slate-400 text-sm mt-1">This virtual room link is invalid.</p>
          <button
            onClick={() => navigate("/home")}
            className="mt-4 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  const copyLink = async () => {
    try {
      const shareLink = `${window.location.origin}/virtual-room/${roomSlug}`;
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">Virtual Room</p>
          <p className="text-xs text-slate-400 truncate">{roomSlug}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyLink}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 text-xs"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            onClick={() => navigate("/home")}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 text-xs"
          >
            Leave
          </button>
        </div>
      </div>

      <div className="w-full" style={{ height: "calc(100vh - 57px)" }}>
        <iframe
          title="FortCode Virtual Room"
          src={roomUrl}
          allow="camera; microphone; fullscreen; display-capture"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}

