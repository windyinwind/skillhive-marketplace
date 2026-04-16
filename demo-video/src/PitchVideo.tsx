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

  // Common transition timings
  const SCENE_DURATION = 450; // 15 seconds each
  
  // Scene 1: Introduction (0s - 15s)
  const introOpacity = interpolate(frame, [0, 30, SCENE_DURATION - 30, SCENE_DURATION], [0, 1, 1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const introY = spring({ fps, frame, config: { damping: 12 } });
  
  // Scene 2: Platform (15s - 30s)
  const platformOpacity = interpolate(frame, [SCENE_DURATION, SCENE_DURATION + 30, SCENE_DURATION * 2 - 30, SCENE_DURATION * 2], [0, 1, 1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const platformImgY = spring({ fps, frame: frame - (SCENE_DURATION + 60), config: { damping: 15 } });

  // Scene 3: Arena (30s - 45s)
  const arenaOpacity = interpolate(frame, [SCENE_DURATION * 2, SCENE_DURATION * 2 + 30, SCENE_DURATION * 3 - 30, SCENE_DURATION * 3], [0, 1, 1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const arenaImgScale = spring({ fps, frame: frame - (SCENE_DURATION * 2 + 60), config: { damping: 12 } });

  // Scene 4: Roadmap (45s - 60s)
  const roadmapOpacity = interpolate(frame, [SCENE_DURATION * 3, SCENE_DURATION * 3 + 30], [0, 1], { extrapolateLeft: "clamp" });
  const roadmapItems = [
    { text: "Next.js 15 Frontend", done: true },
    { text: "Multi-provider LLM routing", done: true },
    { text: "Arena (compare & pay)", done: true },
    { text: "Anchor Smart Contracts", done: "in-progress" },
    { text: "x402 Instant Payments", done: "in-progress" },
    { text: "ElizaOS Plugin Integration", done: "in-progress" }
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

      {/* Audio Tracks */}
      <Sequence from={0} durationInFrames={SCENE_DURATION}>
        <Audio src={staticFile("intro.wav")} />
      </Sequence>
      <Sequence from={SCENE_DURATION} durationInFrames={SCENE_DURATION}>
        <Audio src={staticFile("platform.wav")} />
      </Sequence>
      <Sequence from={SCENE_DURATION * 2} durationInFrames={SCENE_DURATION}>
        <Audio src={staticFile("arena.wav")} />
      </Sequence>
      <Sequence from={SCENE_DURATION * 3} durationInFrames={SCENE_DURATION}>
        <Audio src={staticFile("roadmap.wav")} />
      </Sequence>

      {/* Scene 1: Introduction */}
      <Sequence from={0} durationInFrames={SCENE_DURATION}>
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
              SWARM
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

      {/* Scene 2: Platform Screenshot */}
      <Sequence from={SCENE_DURATION} durationInFrames={SCENE_DURATION}>
        <AbsoluteFill style={{ opacity: platformOpacity }}>
          <div style={{ padding: 120 }}>
            <h2 style={{ fontFamily: spaceGrotesk, fontSize: 90, fontWeight: 700, marginBottom: 10, color: "#38bdf8", letterSpacing: "-0.02em" }}>The Platform</h2>
            <p style={{ fontSize: 40, color: "#94a3b8", marginBottom: 60 }}>Explore 27+ live agentic skills ready to use.</p>
            
            <div style={{
              transform: `translateY(${interpolate(platformImgY, [0, 1], [400, 0])}px)`,
              boxShadow: "0 50px 100px -20px rgba(0, 0, 0, 0.8)",
              borderRadius: 32,
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.15)"
            }}>
              <Img src={staticFile("marketplace.jpeg")} style={{ width: "100%", borderRadius: 32 }} />
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: Arena Screenshot */}
      <Sequence from={SCENE_DURATION * 2} durationInFrames={SCENE_DURATION}>
        <AbsoluteFill style={{ opacity: arenaOpacity, justifyContent: "center", alignItems: "center" }}>
          <div style={{ textAlign: "center", marginBottom: 60, zIndex: 10 }}>
            <h2 style={{ fontFamily: spaceGrotesk, fontSize: 90, fontWeight: 700, color: "#f472b6", letterSpacing: "-0.02em" }}>The Arena</h2>
            <p style={{ fontSize: 44, color: "#94a3b8" }}>Compare answers from multiple skills. Pay for the best.</p>
          </div>
          
          <div style={{
            width: "85%",
            transform: `scale(${interpolate(arenaImgScale, [0, 1], [0.85, 1])})`,
            boxShadow: "0 60px 120px -20px rgba(0, 0, 0, 0.8)",
            borderRadius: 32,
            border: "1px solid rgba(255, 255, 255, 0.15)",
            overflow: "hidden"
          }}>
            <Img src={staticFile("dashboard.jpeg")} style={{ width: "100%", borderRadius: 32 }} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 4: Roadmap */}
      <Sequence from={SCENE_DURATION * 3} durationInFrames={SCENE_DURATION}>
        <AbsoluteFill style={{ opacity: roadmapOpacity, padding: 100, justifyContent: "center" }}>
          <h2 style={{ fontFamily: spaceGrotesk, fontSize: 110, fontWeight: 700, marginBottom: 80, textAlign: "center", letterSpacing: "-0.03em" }}>Roadmap</h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, maxWidth: 1400, margin: "0 auto" }}>
            {roadmapItems.map((item, i) => {
              const itemSpring = spring({ fps, frame: frame - (SCENE_DURATION * 3 + 60 + i * 15), config: { damping: 14 } });
              return (
                <div key={i} style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 30, 
                  fontSize: 36, 
                  backgroundColor: "rgba(255, 255, 255, 0.03)", 
                  padding: "40px 50px", 
                  borderRadius: 24,
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  opacity: itemSpring,
                  transform: `translateX(${interpolate(itemSpring, [0, 1], [-50, 0])}px)`
                }}>
                  <div style={{ 
                    width: 44, 
                    height: 44, 
                    borderRadius: "50%", 
                    backgroundColor: item.done === true ? "#34d399" : "transparent",
                    border: item.done === true ? "3px solid #34d399" : "3px solid #64748b",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexShrink: 0
                  }}>
                    {item.done === true ? (
                      <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "white" }} />
                    ) : item.done === "in-progress" ? (
                       <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#64748b" }} />
                    ) : null}
                  </div>
                  <span style={{ color: item.done === true ? "white" : "#64748b", fontWeight: 600 }}>{item.text}</span>
                  {item.done === "in-progress" && (
                    <span style={{ fontSize: 20, color: "#64748b", border: "1px solid #64748b", padding: "4px 12px", borderRadius: 100, marginLeft: "auto", textTransform: "uppercase", letterSpacing: 1 }}>
                      Next
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 120, textAlign: "center" }}>
             <p style={{ fontSize: 36, color: "#38bdf8", fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", fontFamily: spaceGrotesk }}>
               Built for Solana Renaissance
             </p>
          </div>
        </AbsoluteFill>
      </Sequence>

    </AbsoluteFill>
  );
};
