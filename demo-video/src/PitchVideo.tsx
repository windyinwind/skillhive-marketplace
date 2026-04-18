import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig, spring, Img, staticFile, Audio } from "remotion";
import React from "react";
import { loadFont } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: spaceGrotesk } = loadFont("normal", {
  weights: ["700", "400"],
});

const { fontFamily: inter } = loadInter("normal", {
  weights: ["400", "600"],
});

export const PitchVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timing configuration (1800 frames total @ 30fps)
  const INTRO_END = 210;        // 0-7s
  const MARKETPLACE_END = 510;   // 7-17s
  const CHAT_END = 810;          // 17-27s
  const ARENA_END = 1110;        // 27-37s
  const DASHBOARD_END = 1410;    // 37-47s
  const ROADMAP_END = 1800;      // 47-60s

  // Scene 1: Introduction (0s - 7s)
  const introOpacity = interpolate(frame, [0, 30, INTRO_END - 30, INTRO_END], [0, 1, 1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const introY = spring({ fps, frame, config: { damping: 12 } });
  
  // Scene 2: Marketplace (7s - 17s)
  const marketOpacity = interpolate(frame, [INTRO_END, INTRO_END + 30, MARKETPLACE_END - 30, MARKETPLACE_END], [0, 1, 1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const marketImgY = spring({ fps, frame: frame - (INTRO_END + 45), config: { damping: 15 } });

  // Scene 3: Chat (17s - 27s)
  const chatOpacity = interpolate(frame, [MARKETPLACE_END, MARKETPLACE_END + 30, CHAT_END - 30, CHAT_END], [0, 1, 1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const chatImgScale = spring({ fps, frame: frame - (MARKETPLACE_END + 45), config: { damping: 12 } });

  // Scene 4: Arena (27s - 37s)
  const arenaOpacity = interpolate(frame, [CHAT_END, CHAT_END + 30, ARENA_END - 30, ARENA_END], [0, 1, 1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const arenaImgX = spring({ fps, frame: frame - (CHAT_END + 45), config: { damping: 14 } });

  // Scene 5: Dashboard (37s - 47s)
  const dashboardOpacity = interpolate(frame, [ARENA_END, ARENA_END + 30, DASHBOARD_END - 30, DASHBOARD_END], [0, 1, 1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const dashboardImgY = spring({ fps, frame: frame - (ARENA_END + 45), config: { damping: 15 } });

  // Scene 6: Roadmap (47s - 60s)
  const roadmapOpacity = interpolate(frame, [DASHBOARD_END, DASHBOARD_END + 30], [0, 1], { extrapolateLeft: "clamp" });
  const roadmapItems = [
    { text: "Next.js 15 Frontend", done: true },
    { text: "Multi-provider LLM routing", done: true },
    { text: "Arena (compare & pay)", done: true },
    { text: "Leaderboard & Reputation", done: true },
    { text: "Anchor Smart Contracts", done: true },
    { text: "ElizaOS Plugin Integration", done: true }
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#020617", color: "white", fontFamily: inter }}>
      
      {/* Background Glow */}
      <div style={{
          position: "absolute",
          width: 1200,
          height: 1200,
          background: "radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, rgba(2, 6, 23, 0) 70%)",
          top: -400,
          right: -400,
      }} />
      <div style={{
          position: "absolute",
          width: 1000,
          height: 1000,
          background: "radial-gradient(circle, rgba(129, 140, 248, 0.1) 0%, rgba(2, 6, 23, 0) 70%)",
          bottom: -300,
          left: -300,
      }} />

      {/* Scene 1: Introduction */}
      <Sequence from={0} durationInFrames={INTRO_END}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: introOpacity }}>
          <div style={{ textAlign: "center", transform: `translateY(${interpolate(introY, [0, 1], [50, 0])}px)` }}>
            <h1 style={{ 
              fontFamily: spaceGrotesk,
              fontSize: 160, 
              fontWeight: 700, 
              marginBottom: 0, 
              background: "linear-gradient(to bottom right, #38bdf8, #818cf8)", 
              WebkitBackgroundClip: "text", 
              color: "transparent",
              letterSpacing: "-0.05em"
            }}>
              SkillHive
            </h1>
            <h2 style={{ 
              fontFamily: spaceGrotesk,
              fontSize: 80, 
              fontWeight: 400, 
              marginTop: -20,
              color: "#f8fafc",
              letterSpacing: "0.2em",
              textTransform: "uppercase"
            }}>
              Marketplace
            </h2>
            <div style={{ width: 120, height: 2, background: "rgba(56, 189, 248, 0.5)", margin: "60px auto" }} />
            <p style={{ fontSize: 44, color: "#94a3b8", maxWidth: 1100, lineHeight: 1.4, margin: "0 auto" }}>
              The open platform for AI skill discovery, <br/> payment, and reputation on Solana.
            </p>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: Marketplace */}
      <Sequence from={INTRO_END} durationInFrames={MARKETPLACE_END - INTRO_END}>
        <AbsoluteFill style={{ opacity: marketOpacity }}>
          <div style={{ padding: "80px 120px" }}>
            <h2 style={{ fontFamily: spaceGrotesk, fontSize: 80, fontWeight: 700, marginBottom: 10, color: "#38bdf8", letterSpacing: "-0.02em" }}>Marketplace</h2>
            <p style={{ fontSize: 36, color: "#94a3b8", marginBottom: 40 }}>Browse and compare 27+ live agentic skills.</p>
            
            <div style={{
              transform: `translateY(${interpolate(marketImgY, [0, 1], [400, 0])}px)`,
              boxShadow: "0 50px 100px -20px rgba(0, 0, 0, 0.8)",
              borderRadius: 24,
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.15)"
            }}>
              <Img src={staticFile("marketplace.png")} style={{ width: "100%", borderRadius: 24 }} />
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: Chat */}
      <Sequence from={MARKETPLACE_END} durationInFrames={CHAT_END - MARKETPLACE_END}>
        <AbsoluteFill style={{ opacity: chatOpacity, justifyContent: "center", alignItems: "center" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontFamily: spaceGrotesk, fontSize: 80, fontWeight: 700, color: "#818cf8", letterSpacing: "-0.02em" }}>Orchestrator Chat</h2>
            <p style={{ fontSize: 36, color: "#94a3b8" }}>One interface to rule them all. Discovers and calls skills for you.</p>
          </div>
          
          <div style={{
            width: "80%",
            transform: `scale(${interpolate(chatImgScale, [0, 1], [0.9, 1])})`,
            boxShadow: "0 60px 120px -20px rgba(0, 0, 0, 0.8)",
            borderRadius: 24,
            border: "1px solid rgba(255, 255, 255, 0.15)",
            overflow: "hidden"
          }}>
            <Img src={staticFile("chat.png")} style={{ width: "100%", borderRadius: 24 }} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 4: Arena */}
      <Sequence from={CHAT_END} durationInFrames={ARENA_END - CHAT_END}>
        <AbsoluteFill style={{ opacity: arenaOpacity }}>
          <div style={{ padding: "80px 120px", textAlign: "right" }}>
            <h2 style={{ fontFamily: spaceGrotesk, fontSize: 80, fontWeight: 700, marginBottom: 10, color: "#f472b6", letterSpacing: "-0.02em" }}>The Arena</h2>
            <p style={{ fontSize: 36, color: "#94a3b8", marginBottom: 40 }}>Multi-agent competition. Pay only for what helped.</p>
            
            <div style={{
              transform: `translateX(${interpolate(arenaImgX, [0, 1], [400, 0])}px)`,
              boxShadow: "0 50px 100px -20px rgba(0, 0, 0, 0.8)",
              borderRadius: 24,
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.15)"
            }}>
              <Img src={staticFile("arena.png")} style={{ width: "100%", borderRadius: 24 }} />
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 5: Dashboard */}
      <Sequence from={ARENA_END} durationInFrames={DASHBOARD_END - ARENA_END}>
        <AbsoluteFill style={{ opacity: dashboardOpacity }}>
          <div style={{ padding: "80px 120px" }}>
            <h2 style={{ fontFamily: spaceGrotesk, fontSize: 80, fontWeight: 700, marginBottom: 10, color: "#fbbf24", letterSpacing: "-0.02em" }}>Creator Dashboard</h2>
            <p style={{ fontSize: 36, color: "#94a3b8", marginBottom: 40 }}>Manage skills, track earnings, and build your reputation.</p>
            
            <div style={{
              transform: `translateY(${interpolate(dashboardImgY, [0, 1], [400, 0])}px)`,
              boxShadow: "0 50px 100px -20px rgba(0, 0, 0, 0.8)",
              borderRadius: 24,
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.15)"
            }}>
              <Img src={staticFile("dashboard.png")} style={{ width: "100%", borderRadius: 24 }} />
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 6: Roadmap */}
      <Sequence from={DASHBOARD_END} durationInFrames={ROADMAP_END - DASHBOARD_END}>
        <AbsoluteFill style={{ opacity: roadmapOpacity, padding: 80, justifyContent: "center" }}>
          <h2 style={{ fontFamily: spaceGrotesk, fontSize: 90, fontWeight: 700, marginBottom: 60, textAlign: "center", letterSpacing: "-0.03em" }}>Built for Solana</h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 1400, margin: "0 auto" }}>
            {roadmapItems.map((item, i) => {
              const itemSpring = spring({ fps, frame: frame - (DASHBOARD_END + 45 + i * 12), config: { damping: 14 } });
              return (
                <div key={i} style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 24, 
                  fontSize: 32, 
                  backgroundColor: "rgba(255, 255, 255, 0.03)", 
                  padding: "30px 40px", 
                  borderRadius: 20,
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  opacity: itemSpring,
                  transform: `translateX(${interpolate(itemSpring, [0, 1], [-40, 0])}px)`
                }}>
                  <div style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: "50%", 
                    backgroundColor: "#34d399",
                    border: "3px solid #34d399",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexShrink: 0
                  }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "white" }} />
                  </div>
                  <span style={{ color: "white", fontWeight: 600 }}>{item.text}</span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 80, textAlign: "center" }}>
             <p style={{ fontSize: 32, color: "#38bdf8", fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", fontFamily: spaceGrotesk }}>
               Join the Hive Today
             </p>
          </div>
        </AbsoluteFill>
      </Sequence>

    </AbsoluteFill>
  );
};

