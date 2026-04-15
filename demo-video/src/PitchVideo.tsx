import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig, spring, Img, staticFile, Audio } from "remotion";
import React from "react";

export const PitchVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Common transition timings
  const SCENE_DURATION = 450; // 15 seconds each
  
  // Scene 1: Introduction (0s - 15s)
  const introOpacity = interpolate(frame, [0, 30, SCENE_DURATION - 30, SCENE_DURATION], [0, 1, 1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  
  // Scene 2: Platform (15s - 30s)
  const platformOpacity = interpolate(frame, [SCENE_DURATION, SCENE_DURATION + 30, SCENE_DURATION * 2 - 30, SCENE_DURATION * 2], [0, 1, 1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const platformImgY = spring({ fps, frame: frame - (SCENE_DURATION + 60), config: { damping: 15 } });

  // Scene 3: Arena (30s - 45s)
  const arenaOpacity = interpolate(frame, [SCENE_DURATION * 2, SCENE_DURATION * 2 + 30, SCENE_DURATION * 3 - 30, SCENE_DURATION * 3], [0, 1, 1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const arenaImgScale = spring({ fps, frame: frame - (SCENE_DURATION * 2 + 60), config: { damping: 12 } });

  // Scene 4: Roadmap (45s - 60s)
  const roadmapOpacity = interpolate(frame, [SCENE_DURATION * 3, SCENE_DURATION * 3 + 30], [0, 1], { extrapolateLeft: "clamp" });
  const roadmapItems = [
    { text: "Anchor Smart Contracts", done: true },
    { text: "x402 Instant Payments", done: true },
    { text: "ElizaOS Plugin Integration", done: false },
    { text: "Helius Webhook Indexer", done: false }
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#020617", color: "white", fontFamily: "Inter, system-ui, sans-serif" }}>
      
      {/* Background Glow */}
      <div style={{
          position: "absolute",
          width: 800,
          height: 800,
          background: "radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(2, 6, 23, 0) 70%)",
          top: -200,
          right: -200,
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
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: 130, fontWeight: 900, marginBottom: 20, background: "linear-gradient(to right, #38bdf8, #818cf8)", WebkitBackgroundClip: "text", color: "transparent" }}>
              SWARM
            </h1>
            <h2 style={{ fontSize: 70, fontWeight: 700, margin: 0 }}>Marketplace</h2>
            <div style={{ width: 100, height: 4, background: "#38bdf8", margin: "40px auto" }} />
            <p style={{ fontSize: 40, color: "#94a3b8", maxWidth: 1000, lineHeight: 1.5 }}>
              Discovery, Payment, and Reputation for AI Skills on Solana.
            </p>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: Platform Screenshot */}
      <Sequence from={SCENE_DURATION} durationInFrames={SCENE_DURATION}>
        <AbsoluteFill style={{ opacity: platformOpacity }}>
          <div style={{ padding: 100 }}>
            <h2 style={{ fontSize: 80, fontWeight: 800, marginBottom: 10, color: "#38bdf8" }}>The Platform</h2>
            <p style={{ fontSize: 40, color: "#94a3b8", marginBottom: 60 }}>Explore 27+ live agentic skills</p>
            
            <div style={{
              transform: `translateY(${interpolate(platformImgY, [0, 1], [400, 0])}px)`,
              boxShadow: "0 50px 100px -20px rgba(0, 0, 0, 0.7)",
              borderRadius: 24,
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}>
              <Img src={staticFile("marketplace.jpeg")} style={{ width: "100%", borderRadius: 24 }} />
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: Arena Screenshot */}
      <Sequence from={SCENE_DURATION * 2} durationInFrames={SCENE_DURATION}>
        <AbsoluteFill style={{ opacity: arenaOpacity, justifyContent: "center", alignItems: "center" }}>
          <div style={{ textAlign: "center", marginBottom: 40, zIndex: 10 }}>
            <h2 style={{ fontSize: 80, fontWeight: 800, color: "#f472b6" }}>The Arena</h2>
            <p style={{ fontSize: 40, color: "#94a3b8" }}>Compare answers. Pay for the best.</p>
          </div>
          
          <div style={{
            width: "80%",
            transform: `scale(${interpolate(arenaImgScale, [0, 1], [0.8, 1])})`,
            boxShadow: "0 50px 100px -20px rgba(0, 0, 0, 0.7)",
            borderRadius: 24,
            border: "1px solid rgba(255, 255, 255, 0.1)",
            overflow: "hidden"
          }}>
            <Img src={staticFile("dashboard.jpeg")} style={{ width: "100%", borderRadius: 24 }} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Scene 4: Roadmap */}
      <Sequence from={SCENE_DURATION * 3} durationInFrames={SCENE_DURATION}>
        <AbsoluteFill style={{ opacity: roadmapOpacity, padding: 100, justifyContent: "center" }}>
          <h2 style={{ fontSize: 100, fontWeight: 900, marginBottom: 80, textAlign: "center" }}>Roadmap</h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 30, maxWidth: 1000, margin: "0 auto" }}>
            {roadmapItems.map((item, i) => {
              const itemSpring = spring({ fps, frame: frame - (SCENE_DURATION * 3 + 60 + i * 20), config: { damping: 12 } });
              return (
                <div key={i} style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 30, 
                  fontSize: 50, 
                  backgroundColor: "rgba(255, 255, 255, 0.03)", 
                  padding: "30px 50px", 
                  borderRadius: 20,
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  opacity: itemSpring,
                  transform: `translateX(${interpolate(itemSpring, [0, 1], [-100, 0])}px)`
                }}>
                  <div style={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: "50%", 
                    backgroundColor: item.done ? "#34d399" : "transparent",
                    border: "3px solid #34d399",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center"
                  }}>
                    {item.done && <div style={{ width: 15, height: 15, borderRadius: "50%", backgroundColor: "white" }} />}
                  </div>
                  <span style={{ color: item.done ? "white" : "#64748b" }}>{item.text}</span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 100, textAlign: "center" }}>
             <p style={{ fontSize: 30, color: "#38bdf8", fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
               Built for Solana Renaissance
             </p>
          </div>
        </AbsoluteFill>
      </Sequence>

    </AbsoluteFill>
  );
};
