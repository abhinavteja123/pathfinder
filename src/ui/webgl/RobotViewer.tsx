"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";

export interface RobotViewerRef {
  triggerWaving: (duration?: number) => void;
  triggerGestureAnimation: (gesture: "wave" | "thumbsup" | "peace" | "stop" | "handshake", side?: "left" | "right") => void;
  updateRealtimeGesture: (gesture: "wave" | "thumbsup" | "peace" | "stop" | "handshake" | null, side: "left" | "right" | null) => void;
  playRoboticSound: (type: "startup" | "success" | "chime" | "thinking" | "listening" | "interrupted") => void;
  /** Ends the current gesture immediately (arms return to idle breathing pose).
   * Call this from the TTS utterance's onend/onerror so the gesture holds for
   * exactly as long as the robot is actually speaking, instead of a fixed
   * timer that can end mid-sentence on a long line. */
  stopGesture: () => void;
}

interface RobotViewerProps {
  expression: "idle" | "listening" | "thinking" | "speaking" | "happy" | "surprised" | "angry" | "laughing";
  isSpeaking: boolean;
  theme?: "light" | "dark";
}

export const RobotViewer = forwardRef<RobotViewerRef, RobotViewerProps>(
  ({ expression, isSpeaking, theme = "dark" }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Refs for material/light updates reactively on theme toggle
    const glossyMaterialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
    const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
    const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);

    // Animation trigger states
    const [isWaving, setIsWaving] = useState(false);
    const [currentGesture, setCurrentGesture] = useState<string | null>(null);

    // Refs for animation states
    const isWavingRef = useRef(false);
    const waveTimeRef = useRef(0);
    const gestureTimeRef = useRef(0);
    const gestureTypeRef = useRef<string | null>(null);
    const activeArmRef = useRef<"left" | "right">("right");
    // Tracks the pending auto-clear timeout so stopGesture() can cancel it
    // (avoids a stale timer clearing a NEWER gesture that started since).
    const gestureClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const expressionRef = useRef(expression);
    const isSpeakingRef = useRef(isSpeaking);
    const mouseRef = useRef({ x: 0, y: 0 });

    // Sync props with refs to avoid re-running effects
    useEffect(() => {
      expressionRef.current = expression;
    }, [expression]);

    useEffect(() => {
      isSpeakingRef.current = isSpeaking;
    }, [isSpeaking]);

    // Reactive Theme properties adjustment
    useEffect(() => {
      if (glossyMaterialRef.current) {
        if (theme === "light") {
          glossyMaterialRef.current.color.setHex(0xf8fafc); // Pristine white luxury porcelain
          glossyMaterialRef.current.metalness = 0.10;
          glossyMaterialRef.current.roughness = 0.12;
          glossyMaterialRef.current.clearcoatRoughness = 0.03;
        } else {
          glossyMaterialRef.current.color.setHex(0x08080a); // Premium piano black
          glossyMaterialRef.current.metalness = 0.15;
          glossyMaterialRef.current.roughness = 0.08;
          glossyMaterialRef.current.clearcoatRoughness = 0.03;
        }
        glossyMaterialRef.current.needsUpdate = true;
      }
      if (ambientLightRef.current) {
        if (theme === "light") {
          ambientLightRef.current.color.setHex(0xffffff);
          ambientLightRef.current.intensity = 1.5;
        } else {
          ambientLightRef.current.color.setHex(0x0f172a);
          ambientLightRef.current.intensity = 0.4;
        }
      }
      if (hemiLightRef.current) {
        if (theme === "light") {
          hemiLightRef.current.color.setHex(0xffffff);
          hemiLightRef.current.groundColor.setHex(0x94a3b8);
          hemiLightRef.current.intensity = 1.5;
        } else {
          hemiLightRef.current.color.setHex(0xf8fafc);
          hemiLightRef.current.groundColor.setHex(0x1e293b);
          hemiLightRef.current.intensity = 1.2;
        }
      }
      if (sceneRef.current) {
        if (theme === "light") {
          sceneRef.current.fog = new THREE.FogExp2(0xf8fafc, 0.04);
        } else {
          sceneRef.current.fog = new THREE.FogExp2(0x0a0a1a, 0.05);
        }
      }
    }, [theme]);

    // Robotic sound synthesizer using Web Audio API
    const playSynthSound = (type: "startup" | "success" | "chime" | "thinking" | "listening" | "interrupted") => {
      try {
        if (!audioContextRef.current && typeof window !== "undefined") {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            audioContextRef.current = new AudioContextClass();
          }
        }
        
        const ctx = audioContextRef.current;
        if (!ctx) return;
        if (ctx.state === "suspended") {
          ctx.resume();
        }

        const now = ctx.currentTime;

        if (type === "startup") {
          // A happy, ascending digital chime
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc1.type = "sine";
          osc2.type = "triangle";

          osc1.frequency.setValueAtTime(300, now);
          osc1.frequency.exponentialRampToValueAtTime(880, now + 0.4);

          osc2.frequency.setValueAtTime(150, now);
          osc2.frequency.exponentialRampToValueAtTime(440, now + 0.4);

          gainNode.gain.setValueAtTime(0.15, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

          osc1.connect(gainNode);
          osc2.connect(gainNode);
          gainNode.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.5);
          osc2.stop(now + 0.5);
        } else if (type === "success") {
          // Quick positive beep beep (perfect fourth interval)
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(523.25, now); // C5
          osc.frequency.setValueAtTime(698.46, now + 0.12); // F5

          gainNode.gain.setValueAtTime(0.12, now);
          gainNode.gain.setValueAtTime(0.12, now + 0.12);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

          osc.connect(gainNode);
          gainNode.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.3);
        } else if (type === "chime") {
          // Warm chord chime
          const freqs = [329.63, 392.00, 523.25, 659.25]; // E4, G4, C5, E5
          freqs.forEach((f, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(f, now + idx * 0.05);
            gain.gain.setValueAtTime(0.08, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4 + idx * 0.05);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.05);
            osc.stop(now + 0.5 + idx * 0.05);
          });
        } else if (type === "thinking") {
          // Continuous dynamic low-pitch computation blips
          const notes = [440, 494, 523, 587, 659];
          for (let i = 0; i < 4; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "square";
            const randomNote = notes[Math.floor(Math.random() * notes.length)] * 1.5;
            osc.frequency.setValueAtTime(randomNote, now + i * 0.08);
            gain.gain.setValueAtTime(0.04, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.06);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.07);
          }
        } else if (type === "listening") {
          // Gentle soft chirp indicating listener is active
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
          gainNode.gain.setValueAtTime(0.1, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.2);
        } else if (type === "interrupted") {
          // Quick descending dull chime to show interruption
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.linearRampToValueAtTime(120, now + 0.12);
          gainNode.gain.setValueAtTime(0.08, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.15);
        }
      } catch (err) {
        console.warn("Failed to play synth sound:", err);
      }
    };

    // Ref functions available to parent
    useImperativeHandle(ref, () => ({
      triggerWaving: (duration = 2000) => {
        setIsWaving(true);
        isWavingRef.current = true;
        waveTimeRef.current = 0;
        activeArmRef.current = "right";
        playSynthSound("success");
        setTimeout(() => {
          setIsWaving(false);
          isWavingRef.current = false;
        }, duration);
      },
      updateRealtimeGesture: (gesture, side) => {
        setCurrentGesture(gesture);
        gestureTypeRef.current = gesture;
        
        if (gesture === "wave") {
          setIsWaving(true);
          isWavingRef.current = true;
        } else {
          setIsWaving(false);
          isWavingRef.current = false;
        }
        
        if (gesture) {
          activeArmRef.current = side || (gesture === "peace" ? "left" : "right");
        }
      },
      triggerGestureAnimation: (gesture, side) => {
        setCurrentGesture(gesture);
        gestureTypeRef.current = gesture;
        gestureTimeRef.current = 0;
        activeArmRef.current = side || (gesture === "peace" ? "left" : "right");

        if (gestureClearTimeoutRef.current) clearTimeout(gestureClearTimeoutRef.current);

        if (gesture === "wave") {
          setIsWaving(true);
          isWavingRef.current = true;
          waveTimeRef.current = 0;
          playSynthSound("success");
        } else {
          playSynthSound("chime");
        }
        // Safety-net only -- the real release is stopGesture(), called from
        // WebglRobotAvatar's TTS onend/onerror so the hold matches actual
        // speech length. This just guards against onend never firing (e.g.
        // speechSynthesis silently failing) so a gesture can't get stuck forever.
        gestureClearTimeoutRef.current = setTimeout(() => {
          setIsWaving(false);
          isWavingRef.current = false;
          setCurrentGesture(null);
          gestureTypeRef.current = null;
        }, 8000);
      },
      stopGesture: () => {
        if (gestureClearTimeoutRef.current) {
          clearTimeout(gestureClearTimeoutRef.current);
          gestureClearTimeoutRef.current = null;
        }
        setIsWaving(false);
        isWavingRef.current = false;
        setCurrentGesture(null);
        gestureTypeRef.current = null;
      },
      playRoboticSound: (type) => {
        playSynthSound(type);
      }
    }));

    // Mouse movement listener for head-tracking
    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;
        // Dampen and store
        mouseRef.current = { x, y };
      };

      window.addEventListener("mousemove", handleMouseMove);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
      };
    }, []);

    // Set up Three.js Scene
    useEffect(() => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // 1. Scene & Camera Setup
      const scene = new THREE.Scene();
      sceneRef.current = scene;
      
      // Dynamic atmospheric cosmic space gradient background handled in canvas or container CSS
      // To get real reflection highlights we use an ambient background
      scene.fog = new THREE.FogExp2(theme === "light" ? 0xf8fafc : 0x0a0a1a, 0.05);

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      // Position camera so the robot is beautifully framed and fits perfectly between the speech bubble and bottom button
      camera.position.set(0, 0.15, 8.5);
      camera.lookAt(0, -0.35, 0);

      // 2. Renderer Setup
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      container.appendChild(renderer.domElement);

      // 3. Dynamic Face Canvas Texture Creator
      const faceCanvas = document.createElement("canvas");
      faceCanvas.width = 512;
      faceCanvas.height = 512;
      const faceCtx = faceCanvas.getContext("2d")!;
      const faceTexture = new THREE.CanvasTexture(faceCanvas);

      // Emotion & Gesture Color Scheme Helper
      // Mood-coded palette -- each state gets its OWN distinct, saturated color
      // (not a shared ash tone), so the robot visibly recolors with the text:
      // thinking=yellow, happy/wave/thumbsup=green, angry=red, per explicit
      // user ask. Feeds face (drawEye/drawMouth), glow-ring material, point
      // lights, AND the main body shell (see the animate-loop lerp below) --
      // that last part is what makes it read as the WHOLE robot changing
      // color, not just an accent ring.
      const getEmotionColor = (expr: string, gest: string | null) => {
        const active = gest || expr;
        switch (active) {
          case "happy":
          case "thumbsup":
          case "wave":
            return { primary: "#10b981", glow: "#059669", bgGlow: "rgba(16, 185, 129, 0.30)" }; // emerald green
          case "listening":
            return { primary: "#3b82f6", glow: "#2563eb", bgGlow: "rgba(59, 130, 246, 0.28)" }; // tech blue
          case "thinking":
            return { primary: "#f59e0b", glow: "#d97706", bgGlow: "rgba(245, 158, 11, 0.30)" }; // amber/yellow
          case "surprised":
          case "peace":
            return { primary: "#ec4899", glow: "#db2777", bgGlow: "rgba(236, 72, 153, 0.28)" }; // pink
          case "stop":
            return { primary: "#f97316", glow: "#ea580c", bgGlow: "rgba(249, 115, 22, 0.28)" }; // caution orange
          case "angry":
            return { primary: "#ef4444", glow: "#b91c1c", bgGlow: "rgba(239, 68, 68, 0.32)" }; // red
          case "laughing":
            return { primary: "#a3e635", glow: "#65a30d", bgGlow: "rgba(163, 230, 53, 0.30)" }; // lime, joyful
          case "speaking":
            return { primary: "#22d3ee", glow: "#06b6d4", bgGlow: "rgba(34, 211, 238, 0.28)" }; // cyan
          case "handshake":
            return { primary: "#14b8a6", glow: "#0d9488", bgGlow: "rgba(20, 184, 166, 0.28)" }; // teal, warm greeting
          default:
            return { primary: "#8b5cf6", glow: "#7c3aed", bgGlow: "rgba(139, 92, 246, 0.22)" }; // violet, idle
        }
      };

      // Helper to draw eye
      const drawEye = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        size: number,
        type: string,
        blinkFactor: number,
        time: number,
        colors: { primary: string; glow: string }
      ) => {
        ctx.save();
        ctx.translate(x, y);

        // Styling for glowing eyes (neon overlay shadow using dynamic colors)
        ctx.strokeStyle = colors.primary;
        ctx.fillStyle = colors.primary;
        ctx.lineWidth = 14;
        ctx.lineCap = "round";
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = 18;

        if (blinkFactor < 0.1) {
          // Closed eye (blink line)
          ctx.beginPath();
          ctx.moveTo(-size, 0);
          ctx.lineTo(size, 0);
          ctx.stroke();
        } else if (type === "happy" || type === "thumbsup") {
          // Cute inverted U shaped smile eye
          ctx.beginPath();
          ctx.arc(0, size * 0.2, size, Math.PI, 0, false);
          ctx.stroke();
        } else if (type === "surprised" || type === "stop") {
          // Large circle eyes
          ctx.beginPath();
          ctx.arc(0, 0, size * 1.1, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = colors.primary + "1a"; // 10% opacity fill
          ctx.fill();
        } else if (type === "thinking") {
          // Spinning rings/arcs
          ctx.save();
          ctx.rotate(time * 6);
          ctx.beginPath();
          ctx.arc(0, 0, size, 0, Math.PI * 1.5);
          ctx.stroke();
          ctx.restore();
        } else if (type === "listening") {
          // Soft pulsing vertical capsule
          const pulse = size * (0.8 + Math.sin(time * 12) * 0.15);
          ctx.beginPath();
          ctx.ellipse(0, 0, pulse * 0.5, pulse * 1.2, 0, 0, Math.PI * 2);
          ctx.fillStyle = colors.primary;
          ctx.shadowBlur = 25;
          ctx.fill();
        } else if (type === "angry") {
          // Sharp downward-slanted furrowed brow line
          ctx.beginPath();
          ctx.moveTo(-size, -size * 0.35);
          ctx.lineTo(size, size * 0.35);
          ctx.stroke();
        } else if (type === "laughing") {
          // Squeezed-shut joyful crescent, tighter and higher than the happy arc
          ctx.beginPath();
          ctx.arc(0, size * 0.5, size * 0.85, Math.PI * 1.05, Math.PI * 1.95, false);
          ctx.stroke();
        } else {
          // Standard cute curved horizontal arc (idle)
          ctx.beginPath();
          // Arc bulging upwards slightly
          ctx.arc(0, size * 0.5, size, Math.PI * 1.15, Math.PI * 1.85, false);
          ctx.stroke();
        }

        ctx.restore();
      };

      // Helper to draw mouth
      const drawMouth = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        type: string,
        isSpk: boolean,
        time: number,
        colors: { primary: string; glow: string }
      ) => {
        ctx.save();
        ctx.translate(x, y);

        ctx.strokeStyle = colors.primary;
        ctx.fillStyle = colors.primary;
        ctx.lineWidth = 14;
        ctx.lineCap = "round";
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = 18;

        if (isSpk) {
          // Talking waveline representing voice waves
          ctx.beginPath();
          ctx.moveTo(-width * 0.8, 0);
          for (let i = -width * 0.8; i <= width * 0.8; i += 10) {
            const waveY = Math.sin(i * 0.1 + time * 25) * 24 * Math.sin(time * 5);
            ctx.lineTo(i, waveY);
          }
          ctx.stroke();
        } else if (type === "happy" || type === "thumbsup") {
          // Big smiling mouth
          ctx.beginPath();
          ctx.arc(0, -10, width * 0.7, 0, Math.PI, false);
          ctx.stroke();
        } else if (type === "surprised" || type === "stop") {
          // Tiny shocked circle
          ctx.beginPath();
          ctx.arc(0, 5, 20, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = colors.primary + "26"; // 15% opacity fill
          ctx.fill();
        } else if (type === "thinking") {
          // Flat horizontal small wave/dot line
          ctx.beginPath();
          ctx.moveTo(-width * 0.4, 0);
          ctx.quadraticCurveTo(0, Math.sin(time * 5) * 8, width * 0.4, 0);
          ctx.stroke();
        } else if (type === "listening") {
          // Dotted wavy line
          ctx.beginPath();
          ctx.moveTo(-width * 0.6, 0);
          ctx.bezierCurveTo(-width * 0.3, Math.sin(time * 8) * 12, width * 0.3, -Math.sin(time * 8) * 12, width * 0.6, 0);
          ctx.stroke();
        } else if (type === "angry") {
          // Flat downward frown arc
          ctx.beginPath();
          ctx.arc(0, 20, width * 0.6, Math.PI * 1.15, Math.PI * 1.85, true);
          ctx.stroke();
        } else if (type === "laughing") {
          // Wide open zigzag "HA" laugh mouth
          ctx.beginPath();
          ctx.moveTo(-width * 0.65, -5);
          ctx.lineTo(-width * 0.2, 12 + Math.sin(time * 20) * 4);
          ctx.lineTo(0, -8);
          ctx.lineTo(width * 0.2, 12 + Math.sin(time * 20 + 1) * 4);
          ctx.lineTo(width * 0.65, -5);
          ctx.stroke();
          ctx.fillStyle = colors.primary + "26";
          ctx.fill();
        } else {
          // Gentle smile (idle)
          ctx.beginPath();
          ctx.arc(0, -15, width * 0.6, 0.15 * Math.PI, 0.85 * Math.PI, false);
          ctx.stroke();
        }

        ctx.restore();
      };

      // Updates canvas texture with expressions
      const updateFaceCanvas = (time: number, blink: number) => {
        const curExp = expressionRef.current;
        const curSpk = isSpeakingRef.current;
        const activeGest = gestureTypeRef.current;
        
        // Dynamically get the theme colors for this state!
        const colors = getEmotionColor(curExp, activeGest);

        // Clear with dark tech face backing
        faceCtx.fillStyle = "#020617"; // slate-950
        faceCtx.fillRect(0, 0, 512, 512);

        // Glowing background halo matching the active state's colors!
        const grad = faceCtx.createRadialGradient(256, 256, 40, 256, 256, 250);
        grad.addColorStop(0, colors.bgGlow);
        grad.addColorStop(1, "rgba(2, 6, 23, 0)");
        faceCtx.fillStyle = grad;
        faceCtx.fillRect(0, 0, 512, 512);

        // Draw eyes
        const eyeOffset = 110;
        const eyeY = 210;
        const eyeSize = 52;
        drawEye(faceCtx, 256 - eyeOffset, eyeY, eyeSize, curExp, blink, time, colors);
        drawEye(faceCtx, 256 + eyeOffset, eyeY, eyeSize, curExp, blink, time, colors);

        // Draw mouth
        drawMouth(faceCtx, 256, 350, 90, curExp, curSpk, time, colors);

        // Inform Three.js that texture needs replacement
        faceTexture.needsUpdate = true;
      };

      // 4. Materials setup (beautiful premium clearcoated physical materials for luxury sheen)
      const glossyMaterial = new THREE.MeshPhysicalMaterial({
        color: theme === "light" ? 0x8a95a5 : 0x222629, // Elegant Matte Pebble Ash OR Deep Volcanic Graphite-Basalt Ash
        roughness: 0.38, // Satin bead-blasted micro-texture
        metalness: 0.75, // Rich metallic alloy depth
        clearcoat: 0.65, // Sophisticated clearcoat lacquer shell
        clearcoatRoughness: 0.12, // Fine polished outer reflections
      });
      glossyMaterialRef.current = glossyMaterial;

      // Polished metal ash accent material (brushed titanium/platinum-pewter)
      const accentMaterial = new THREE.MeshPhysicalMaterial({
        color: theme === "light" ? 0xc3cbd6 : 0x4a5157, // Light Brushed Pewter OR Premium Dark Titanium-Ash
        roughness: 0.15, // Highly polished metal satin finish
        metalness: 0.95, // Pure metal behavior
        clearcoat: 1.0, // Wet lacquer clearcoat shine
        clearcoatRoughness: 0.05, // Mirror-like specular highlights
      });

      const screenMaterial = new THREE.MeshBasicMaterial({
        map: faceTexture,
        toneMapped: false,
      });

      const glowMaterial = new THREE.MeshBasicMaterial({
        color: theme === "light" ? 0x94a3b8 : 0xcbd5e1, // Ash-grey glow, idle-state default
      });

      const bezelMaterial = new THREE.MeshPhysicalMaterial({
        color: theme === "light" ? 0x374151 : 0x111315, // Sleek slate border OR deep rich charcoal-black bezel
        roughness: 0.15,
        metalness: 0.85,
        clearcoat: 1.0,
      });

      // 5. Build Robot Structure
      const robotGroup = new THREE.Group();
      robotGroup.scale.set(0.8, 0.8, 0.8);
      scene.add(robotGroup);

      // --- Head ---
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 1.3, 0);
      robotGroup.add(headGroup);
 
      // Head Helmet (squished sphere for rounded screen look)
      const helmetGeom = new THREE.SphereGeometry(1.5, 32, 32);
      helmetGeom.scale(1.0, 0.95, 0.9);
      const helmetMesh = new THREE.Mesh(helmetGeom, glossyMaterial);
      helmetMesh.position.set(0, 0.05, 0); // perfectly concentric with screen & ears
      headGroup.add(helmetMesh);
 
      // Front Face Screen Dome (curved sphere dome fitting perfectly outside helmet with 1.515 radius to prevent any depth intersections)
      const screenGeom = new THREE.SphereGeometry(1.515, 32, 32, 0, Math.PI * 2, 0, 0.65);
      screenGeom.rotateX(Math.PI / 2); // rotate to point forward (+Z)
      screenGeom.scale(1.0, 0.95, 0.9); // squish identically to helmet
 
      // Map UV coordinates of the screen dome for perfect flat cartesian projection
      const posAttr = screenGeom.attributes.position;
      const uvAttr = screenGeom.attributes.uv;
      if (posAttr && uvAttr) {
        for (let i = 0; i < posAttr.count; i++) {
          const x = posAttr.getX(i);
          const y = posAttr.getY(i);
          // Screen radius is around 0.9 in projected width.
          // Map x, y from approx [-0.9, 0.9] to [0, 1]
          const u = (x / 1.8) + 0.5;
          const v = (y / 1.8) + 0.5;
          uvAttr.setXY(i, u, v);
        }
        uvAttr.needsUpdate = true;
      }
 
      const screenMesh = new THREE.Mesh(screenGeom, screenMaterial);
      screenMesh.position.set(0, 0.05, 0); // centered at head joint
      headGroup.add(screenMesh);
 
      // Headphones / Ears
      const earGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.35, 16);
      const earLeftMesh = new THREE.Mesh(earGeom, accentMaterial);
      earLeftMesh.position.set(-1.42, 0.05, 0);
      earLeftMesh.rotation.z = Math.PI / 2;
      headGroup.add(earLeftMesh);

      const earRightMesh = new THREE.Mesh(earGeom, accentMaterial);
      earRightMesh.position.set(1.42, 0.05, 0);
      earRightMesh.rotation.z = -Math.PI / 2;
      headGroup.add(earRightMesh);

      // Headphones glowing neon ring
      const earRingGeom = new THREE.TorusGeometry(0.2, 0.03, 8, 32);
      const earRingLeft = new THREE.Mesh(earRingGeom, glowMaterial);
      earRingLeft.position.set(-1.58, 0.05, 0);
      earRingLeft.rotation.y = Math.PI / 2;
      headGroup.add(earRingLeft);

      const earRingRight = new THREE.Mesh(earRingGeom, glowMaterial);
      earRingRight.position.set(1.58, 0.05, 0);
      earRingRight.rotation.y = -Math.PI / 2;
      headGroup.add(earRingRight);

      // --- Torso / Body ---
      const torsoGroup = new THREE.Group();
      torsoGroup.position.set(0, -0.6, 0);
      robotGroup.add(torsoGroup);

      // Curved round floating body
      const torsoGeom = new THREE.SphereGeometry(1.05, 32, 32);
      torsoGeom.scale(1.0, 1.25, 0.85);
      const torsoMesh = new THREE.Mesh(torsoGeom, glossyMaterial);
      torsoGroup.add(torsoMesh);

      // Emissive Chest Glowing Core Ring (positioned to float perfectly on the curved torso surface)
      const coreRingGeom = new THREE.TorusGeometry(0.36, 0.07, 16, 64);
      const coreRingMesh = new THREE.Mesh(coreRingGeom, glowMaterial);
      coreRingMesh.position.set(0, 0.15, 0.84); // correctly positioned to sit on chest surface
      coreRingMesh.rotation.x = 0.15; // angled up
      torsoGroup.add(coreRingMesh);

      // Premium Golden Outlined Bezel around core
      const coreRingBezelGeom = new THREE.TorusGeometry(0.44, 0.03, 16, 64);
      const coreRingBezelMesh = new THREE.Mesh(coreRingBezelGeom, accentMaterial);
      coreRingBezelMesh.position.set(0, 0.15, 0.82);
      coreRingBezelMesh.rotation.x = 0.15;
      torsoGroup.add(coreRingBezelMesh);

      // --- Arms (Rigged with perfect pivot joint skeletons to eliminate physical gaps) ---
      const shoulderGeom = new THREE.SphereGeometry(0.22, 16, 16);
      const armSegmentGeom = new THREE.CylinderGeometry(0.16, 0.12, 0.75, 16);

      // Parent hand geometries for high-fidelity shared usage & memory disposal
      const palmGeom = new THREE.CylinderGeometry(0.12, 0.14, 0.15, 16);
      
      // We divide each finger into two articulating segments:
      // 1. Metacarpal (base) segment: Capsule with top cap center at local (0,0,0)
      const fingerBaseGeom = new THREE.CapsuleGeometry(0.065, 0.08, 4, 12);
      fingerBaseGeom.translate(0, -0.04, 0);

      // 2. Phalangeal (tip) segment: Slightly thinner capsule tapering nicely, top cap center at local (0,0,0)
      const fingerTipGeom = new THREE.CapsuleGeometry(0.052, 0.08, 4, 12);
      fingerTipGeom.translate(0, -0.04, 0);

      const palmGlowGeom = new THREE.SphereGeometry(0.05, 8, 8);

      // Helper to build a high-fidelity robot hand/claw with articulating fingers
      const createRobotHand = () => {
        const hGroup = new THREE.Group();
        hGroup.name = "hand";

        // 1. Wrist/Palm hub
        const palmMesh = new THREE.Mesh(palmGeom, glossyMaterial);
        palmMesh.position.set(0, -0.07, 0);
        hGroup.add(palmMesh);

        // 2. Left finger/claw (Gold accent) - Pivoted directly at bottom of palm (-0.145)
        const fingerLeft = new THREE.Mesh(fingerBaseGeom, accentMaterial);
        fingerLeft.name = "fingerLeft";
        fingerLeft.position.set(-0.08, -0.145, 0);
        
        const fingerLeftTip = new THREE.Mesh(fingerTipGeom, accentMaterial);
        fingerLeftTip.name = "fingerLeftTip";
        fingerLeftTip.position.set(0, -0.08, 0); // connected perfectly at the end of the base segment
        fingerLeft.add(fingerLeftTip);
        hGroup.add(fingerLeft);

        // 3. Right finger/claw (Gold accent) - Pivoted directly at bottom of palm (-0.145)
        const fingerRight = new THREE.Mesh(fingerBaseGeom, accentMaterial);
        fingerRight.name = "fingerRight";
        fingerRight.position.set(0.08, -0.145, 0);

        const fingerRightTip = new THREE.Mesh(fingerTipGeom, accentMaterial);
        fingerRightTip.name = "fingerRightTip";
        fingerRightTip.position.set(0, -0.08, 0); // connected perfectly at the end of the base segment
        fingerRight.add(fingerRightTip);
        hGroup.add(fingerRight);

        // 4. Thumb claw (Gold accent) - Pivoted directly at bottom of palm (-0.145)
        const fingerThumb = new THREE.Mesh(fingerBaseGeom, accentMaterial);
        fingerThumb.name = "fingerThumb";
        fingerThumb.position.set(0, -0.145, 0.08);

        const fingerThumbTip = new THREE.Mesh(fingerTipGeom, accentMaterial);
        fingerThumbTip.name = "fingerThumbTip";
        fingerThumbTip.position.set(0, -0.08, 0); // connected perfectly at the end of the base segment
        fingerThumb.add(fingerThumbTip);
        hGroup.add(fingerThumb);

        // 5. Add a glowing finger-tip core or palm emitter
        const palmGlowMesh = new THREE.Mesh(palmGlowGeom, glowMaterial);
        palmGlowMesh.position.set(0, -0.12, 0);
        hGroup.add(palmGlowMesh);

        return hGroup;
      };

      // Left Arm (nested closely against the sides of the torso for a highly polished, professional look)
      const leftArmGroup = new THREE.Group();
      leftArmGroup.position.set(-1.1, -0.4, 0.0);
      robotGroup.add(leftArmGroup);

      const leftShoulder = new THREE.Mesh(shoulderGeom, accentMaterial);
      leftArmGroup.add(leftShoulder);

      const leftArmSegment = new THREE.Mesh(armSegmentGeom, glossyMaterial);
      leftArmSegment.position.set(0, -0.37, 0); // connected exactly at the shoulder center
      leftArmGroup.add(leftArmSegment);

      const leftHand = createRobotHand();
      leftHand.position.set(0, -0.75, 0); // attached at end of cylinder arm segment
      leftArmGroup.add(leftHand);

      // Right Arm (Used for Waving! Nested closely against the sides of the torso)
      const rightArmGroup = new THREE.Group();
      rightArmGroup.position.set(1.1, -0.4, 0.0);
      robotGroup.add(rightArmGroup);

      const rightShoulder = new THREE.Mesh(shoulderGeom, accentMaterial);
      rightArmGroup.add(rightShoulder);

      const rightArmSegment = new THREE.Mesh(armSegmentGeom, glossyMaterial);
      rightArmSegment.position.set(0, -0.37, 0); // connected exactly at the shoulder center
      rightArmGroup.add(rightArmSegment);

      const rightHand = createRobotHand();
      rightHand.position.set(0, -0.75, 0); // attached at end of cylinder arm segment
      rightArmGroup.add(rightHand);

      // --- Underglow / Hologram Base Ring ---
      const underglowRingGeom = new THREE.TorusGeometry(1.3, 0.03, 8, 64);
      const underglowRingMesh = new THREE.Mesh(underglowRingGeom, glowMaterial);
      underglowRingMesh.position.set(0, -2.1, 0);
      underglowRingMesh.rotation.x = Math.PI / 2; // Flat on floor
      scene.add(underglowRingMesh);


      // Subtle dust particles drifting in background
      const starsCount = 120;
      const starsGeom = new THREE.BufferGeometry();
      const starPositions = new Float32Array(starsCount * 3);
      for (let i = 0; i < starsCount * 3; i += 3) {
        starPositions[i] = (Math.random() - 0.5) * 16;
        starPositions[i + 1] = (Math.random() - 0.5) * 16;
        starPositions[i + 2] = (Math.random() - 0.5) * 10 - 4;
      }
      starsGeom.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
      const starMaterial = new THREE.PointsMaterial({
        color: theme === "light" ? 0x6b7280 : 0x9ca3af, // Elegant soft grey-ash stardust particles
        size: 0.04,
        transparent: true,
        opacity: theme === "light" ? 0.35 : 0.55,
      });
      const starPoints = new THREE.Points(starsGeom, starMaterial);
      scene.add(starPoints);

      // 6. Lights Setup
      // Soft ambient light
      const ambientLight = new THREE.AmbientLight(
        theme === "light" ? 0xffffff : 0x181a1c, // Neutral-dark ash shadow-fill in dark mode
        theme === "light" ? 1.5 : 0.4
      );
      scene.add(ambientLight);
      ambientLightRef.current = ambientLight;

      // Soft hemisphere light for beautiful environmental reflections and professional gradients
      const hemiLight = new THREE.HemisphereLight(
        theme === "light" ? 0xffffff : 0xe5e7eb, // Sky color (pure, bright, silver white)
        theme === "light" ? 0x94a3b8 : 0x24272a, // Ground color (soft pebble grey OR graphite-charcoal ash)
        theme === "light" ? 1.5 : 1.25 // balanced intensity
      );
      scene.add(hemiLight);
      hemiLightRef.current = hemiLight;

      // Soft white top overhead light
      const overheadLight = new THREE.DirectionalLight(0xffffff, 3.5);
      overheadLight.position.set(0, 5, 3);
      scene.add(overheadLight);

      // Clean cool white fill light (from top left for glossy black specular shine)
      const fillLightLeft = new THREE.PointLight(0xe2e8f0, 4.0, 12); // slate-200 cool white
      fillLightLeft.position.set(-3, 2, 2);
      scene.add(fillLightLeft);

      // Warm white key light (from top right)
      const keyLightRight = new THREE.PointLight(0xfffbeb, 5.0, 12); // amber-50 warm white
      keyLightRight.position.set(3, 1, 2);
      scene.add(keyLightRight);

      // Subtle upward glowing light from floor matching default idle theme
      const bottomGlow = new THREE.PointLight(theme === "light" ? 0x94a3b8 : 0xcbd5e1, 2.0, 6);
      bottomGlow.position.set(0, -2.5, 0);
      scene.add(bottomGlow);

      // 7. Render Loop Variables
      const clock = new THREE.Clock();
      let lastBlinkTime = 0;
      let blinkDuration = 0.12;
      let blinkInterval = 4.0; // blink every 4s
      let isBlinking = false;

      // 8. Animation & Render Loop
      let animationFrameId: number;
      
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);

        const time = clock.getElapsedTime();
        const delta = clock.getDelta();

        // A. Natural vertical hover float (sine-wave) - Optimized to be perfectly centered and clear overlays
        const floatY = Math.sin(time * 1.8) * 0.12;
        robotGroup.position.y = -0.75 + floatY;

        // B. Underglow ring pulsates in scale and opacity
        const glowScale = 1.0 + Math.sin(time * 3.0) * 0.06;
        underglowRingMesh.scale.set(glowScale, glowScale, 1.0);

        // C. Rotate background stars with high fidelity cinematic swirl
        starPoints.rotation.y = time * 0.045;
        starPoints.rotation.x = time * 0.022;
        starPoints.position.y = Math.sin(time * 0.6) * 0.15; // smooth slow ambient floating

        // D. Smooth Head Idle tilting + Mouse-cursor Tracking
        const targetHeadRotY = mouseRef.current.x * 0.45;
        const targetHeadRotX = -mouseRef.current.y * 0.35;

        // Smoothly interpolate (lerp) towards target mouse look
        headGroup.rotation.y += (targetHeadRotY - headGroup.rotation.y) * 0.08;
        headGroup.rotation.x += (targetHeadRotX - headGroup.rotation.x) * 0.08;

        // E. Arm and Finger animations
        const activeGest = gestureTypeRef.current;
        const activeArm = activeArmRef.current;

        // Smoothly interpolate glowMaterial & light colors to match current emotion color!
        const curExp = expressionRef.current;
        const colors = getEmotionColor(curExp, activeGest);
        const targetColor = new THREE.Color(colors.primary);
        glowMaterial.color.lerp(targetColor, 0.08);
        fillLightLeft.color.lerp(targetColor, 0.08);
        keyLightRight.color.lerp(targetColor, 0.08);
        bottomGlow.color.lerp(targetColor, 0.08);
        // Also wash the main body shell + accents toward the mood color (slower
        // than the glow ring) so a held mood reads as the WHOLE robot changing
        // color, not just its glow trim -- user explicitly wants "full yellow"
        // when thinking, not a grey robot with a yellow ring.
        glossyMaterial.color.lerp(targetColor, 0.05);
        // accentMaterial (fingers/ears/shoulders/bezel) deliberately does NOT
        // wash toward the mood color -- it stays its fixed metal tone so fine
        // details like fingers keep contrast against the now-tinted palm/body.
        // Tinting it too (tried earlier this session) made same-colored
        // fingers visually merge into the palm/glow, reading as a jagged
        // blob instead of distinct fingers -- caught from a user screenshot.

        // Query hand structures for finger rotations
        const leftHand = leftArmGroup.getObjectByName("hand");
        const rightHand = rightArmGroup.getObjectByName("hand");

        const lFingerLeft = leftHand?.getObjectByName("fingerLeft");
        const lFingerRight = leftHand?.getObjectByName("fingerRight");
        const lFingerThumb = leftHand?.getObjectByName("fingerThumb");

        const lFingerLeftTip = lFingerLeft?.getObjectByName("fingerLeftTip");
        const lFingerRightTip = lFingerRight?.getObjectByName("fingerRightTip");
        const lFingerThumbTip = lFingerThumb?.getObjectByName("fingerThumbTip");

        const rFingerLeft = rightHand?.getObjectByName("fingerLeft");
        const rFingerRight = rightHand?.getObjectByName("fingerRight");
        const rFingerThumb = rightHand?.getObjectByName("fingerThumb");

        const rFingerLeftTip = rFingerLeft?.getObjectByName("fingerLeftTip");
        const rFingerRightTip = rFingerRight?.getObjectByName("fingerRightTip");
        const rFingerThumbTip = rFingerThumb?.getObjectByName("fingerThumbTip");

        // --- Right & Left Arm/Hand State Machine Lerp Targets ---
        let targetR_ArmPos = { x: 1.1, y: -0.40, z: 0.0 };
        let targetR_ArmRot = { x: -0.1, y: -0.1, z: 0.15 }; // Default resting pose (rotated slightly outwards to avoid chest clipping)
        let targetR_HandRot = { x: 0.1, y: -0.1, z: -0.1 };

        let targetL_ArmPos = { x: -1.1, y: -0.40, z: 0.0 };
        let targetL_ArmRot = { x: -0.1, y: 0.1, z: -0.15 }; // Default resting pose (rotated slightly outwards to avoid chest clipping)
        let targetL_HandRot = { x: 0.1, y: 0.1, z: 0.1 };

        // --- Right Arm State Machine (Projected forward +Z, facing user) ---
        if (activeArm === "right" && isWavingRef.current) {
          waveTimeRef.current += 16;
          // Wave right arm: high, wide, pointing outwards and upwards (+X, +Y direction) with stable shoulder anchor
          targetR_ArmPos = { x: 1.1, y: -0.40, z: 0.0 };
          const sweep = Math.sin(time * 11.0) * 0.22;
          targetR_ArmRot = { x: -0.4, y: -0.3, z: 1.95 + sweep }; // Corrected positive Z for outward waving
          // Dual-jointed wrist drag: overlapping action creates highly realistic wave
          targetR_HandRot = { x: 0.1, y: -0.2, z: -0.8 - sweep * 1.5 }; 
        } else if (activeArm === "right" && activeGest === "thumbsup") {
          // Thumbs up right arm: extended forward and slightly outward with stable shoulder anchor
          targetR_ArmPos = { x: 1.1, y: -0.40, z: 0.0 };
          targetR_ArmRot = { x: -1.1, y: -0.3, z: -0.6 };
          targetR_HandRot = { x: 0.2, y: 1.1, z: -0.3 }; // thumb points up, palm faces side-front
          headGroup.position.y = 1.3 + Math.sin(time * 8.0) * 0.05; // Nod head
        } else if (activeArm === "right" && activeGest === "peace") {
          // Peace sign right arm: raise up and point fingers forward with stable shoulder anchor
          targetR_ArmPos = { x: 1.1, y: -0.40, z: 0.0 };
          targetR_ArmRot = { x: -1.2, y: -0.3, z: -0.7 };
          targetR_HandRot = { x: 0.2, y: 0.8, z: -0.3 }; // V sign faces the camera
        } else if (activeArm === "right" && activeGest === "handshake") {
          // Handshake right arm: extend forward with stable shoulder anchor
          targetR_ArmPos = { x: 1.1, y: -0.40, z: 0.0 };
          targetR_ArmRot = { x: -1.1, y: -0.15, z: -0.15 }; // Adjusted to avoid chest clipping
          targetR_HandRot = { x: 0.0, y: 0.0, z: 0.0 }; // Clean vertical shake pose directly in front, no distortion
        } else if (activeGest === "stop") {
          // Stop sign: raised outward and forward with stable shoulder anchor
          targetR_ArmPos = { x: 1.1, y: -0.40, z: 0.0 };
          targetR_ArmRot = { x: -1.1, y: -0.3, z: -0.5 };
          targetR_HandRot = { x: -0.8, y: -0.1, z: -0.2 }; // palm flat facing user directly
        } else {
          // Normal floating idle right arm (stable shoulder socket, beautiful dynamic wrist breathing)
          targetR_ArmPos = { 
            x: 1.1, 
            y: -0.40 + Math.sin(time * 2.2) * 0.02, 
            z: 0.0 + Math.sin(time * 1.5) * 0.02
          };
          targetR_ArmRot = { 
            x: -0.1 + Math.sin(time * 1.1) * 0.04, 
            y: -0.1, 
            z: 0.15 + Math.sin(time * 1.5) * 0.04 
          };
          targetR_HandRot = { x: 0.1, y: -0.1, z: -0.1 };
          headGroup.position.y = THREE.MathUtils.lerp(headGroup.position.y, 1.3, 0.18);
        }

        // --- Left Arm State Machine (Projected forward +Z, facing user) ---
        if (activeArm === "left" && isWavingRef.current) {
          waveTimeRef.current += 16;
          // Wave left arm: high, wide, pointing outwards and upwards (-X, +Y direction) with shoulder joint perfectly anchored
          targetL_ArmPos = { x: -1.1, y: -0.40, z: 0.0 };
          const sweep = Math.sin(time * 11.0) * 0.22;
          targetL_ArmRot = { x: -0.4, y: 0.3, z: -1.95 - sweep }; // Corrected negative Z for outward waving
          // Dual-jointed wrist drag: overlapping action creates highly realistic wave
          targetL_HandRot = { x: 0.1, y: 0.2, z: 0.8 + sweep * 1.5 };
        } else if (activeArm === "left" && activeGest === "thumbsup") {
          // Thumbs up left arm with stable shoulder anchor
          targetL_ArmPos = { x: -1.1, y: -0.40, z: 0.0 };
          targetL_ArmRot = { x: -1.1, y: 0.3, z: 0.6 };
          targetL_HandRot = { x: 0.2, y: -1.1, z: 0.3 };
          headGroup.position.y = 1.3 + Math.sin(time * 8.0) * 0.05; // Nod head
        } else if (activeArm === "left" && activeGest === "peace") {
          // Peace sign left arm with stable shoulder anchor
          targetL_ArmPos = { x: -1.1, y: -0.40, z: 0.0 };
          targetL_ArmRot = { x: -1.2, y: 0.3, z: 0.7 };
          targetL_HandRot = { x: 0.2, y: -0.8, z: 0.3 };
        } else if (activeArm === "left" && activeGest === "handshake") {
          // Handshake left arm with stable shoulder anchor
          targetL_ArmPos = { x: -1.1, y: -0.40, z: 0.0 };
          targetL_ArmRot = { x: -1.1, y: 0.15, z: 0.15 }; // Adjusted to avoid chest clipping
          targetL_HandRot = { x: 0.0, y: 0.0, z: 0.0 }; // Clean vertical shake pose directly in front, no distortion
        } else if (activeGest === "stop") {
          // Stop sign left arm with stable shoulder anchor
          targetL_ArmPos = { x: -1.1, y: -0.40, z: 0.0 };
          targetL_ArmRot = { x: -1.1, y: 0.3, z: 0.5 };
          targetL_HandRot = { x: -0.8, y: 0.1, z: 0.2 };
        } else {
          // Normal floating idle left arm (stable shoulder socket, beautiful dynamic wrist breathing)
          targetL_ArmPos = { 
            x: -1.1, 
            y: -0.40 + Math.sin(time * 2.2 + Math.PI) * 0.02, 
            z: 0.0 + Math.sin(time * 1.5 + Math.PI) * 0.02
          };
          targetL_ArmRot = { 
            x: -0.1 + Math.sin(time * 1.1 + Math.PI) * 0.04, 
            y: 0.1, 
            z: -0.15 - Math.sin(time * 1.5 + Math.PI) * 0.04 
          };
          targetL_HandRot = { x: 0.1, y: 0.1, z: 0.1 };
        }

        // --- Smoothly Lerp Positions & Rotations (Snappy & Responsive 0.26 Lerp Rate) ---
        rightArmGroup.position.x = THREE.MathUtils.lerp(rightArmGroup.position.x, targetR_ArmPos.x, 0.26);
        rightArmGroup.position.y = THREE.MathUtils.lerp(rightArmGroup.position.y, targetR_ArmPos.y, 0.26);
        rightArmGroup.position.z = THREE.MathUtils.lerp(rightArmGroup.position.z, targetR_ArmPos.z, 0.26);

        rightArmGroup.rotation.x = THREE.MathUtils.lerp(rightArmGroup.rotation.x, targetR_ArmRot.x, 0.26);
        rightArmGroup.rotation.y = THREE.MathUtils.lerp(rightArmGroup.rotation.y, targetR_ArmRot.y, 0.26);
        rightArmGroup.rotation.z = THREE.MathUtils.lerp(rightArmGroup.rotation.z, targetR_ArmRot.z, 0.26);

        leftArmGroup.position.x = THREE.MathUtils.lerp(leftArmGroup.position.x, targetL_ArmPos.x, 0.26);
        leftArmGroup.position.y = THREE.MathUtils.lerp(leftArmGroup.position.y, targetL_ArmPos.y, 0.26);
        leftArmGroup.position.z = THREE.MathUtils.lerp(leftArmGroup.position.z, targetL_ArmPos.z, 0.26);

        leftArmGroup.rotation.x = THREE.MathUtils.lerp(leftArmGroup.rotation.x, targetL_ArmRot.x, 0.26);
        leftArmGroup.rotation.y = THREE.MathUtils.lerp(leftArmGroup.rotation.y, targetL_ArmRot.y, 0.26);
        leftArmGroup.rotation.z = THREE.MathUtils.lerp(leftArmGroup.rotation.z, targetL_ArmRot.z, 0.26);

        if (rightHand) {
          rightHand.rotation.x = THREE.MathUtils.lerp(rightHand.rotation.x, targetR_HandRot.x, 0.26);
          rightHand.rotation.y = THREE.MathUtils.lerp(rightHand.rotation.y, targetR_HandRot.y, 0.26);
          rightHand.rotation.z = THREE.MathUtils.lerp(rightHand.rotation.z, targetR_HandRot.z, 0.26);
        }

        if (leftHand) {
          leftHand.rotation.x = THREE.MathUtils.lerp(leftHand.rotation.x, targetL_HandRot.x, 0.26);
          leftHand.rotation.y = THREE.MathUtils.lerp(leftHand.rotation.y, targetL_HandRot.y, 0.26);
          leftHand.rotation.z = THREE.MathUtils.lerp(leftHand.rotation.z, targetL_HandRot.z, 0.26);
        }

        // --- Dynamic Finger Bending Interpolations (Snappy & Synchronized) ---
        // Lerp right hand fingers based on current gesture
        if (rFingerLeft && rFingerRight && rFingerThumb) {
          const isRightActive = activeArm === "right" || activeGest === "stop";
          if (isRightActive && activeGest === "thumbsup") {
            // Thumbs up: Thumb points straight up/out, other fingers curl closed tightly
            rFingerThumb.rotation.x = THREE.MathUtils.lerp(rFingerThumb.rotation.x, 0.6, 0.28);
            rFingerThumb.rotation.y = THREE.MathUtils.lerp(rFingerThumb.rotation.y, 0, 0.28);
            rFingerThumb.rotation.z = THREE.MathUtils.lerp(rFingerThumb.rotation.z, 0, 0.28);
            if (rFingerThumbTip) {
              rFingerThumbTip.rotation.x = THREE.MathUtils.lerp(rFingerThumbTip.rotation.x, 0.1, 0.28);
              rFingerThumbTip.rotation.y = THREE.MathUtils.lerp(rFingerThumbTip.rotation.y, 0, 0.28);
              rFingerThumbTip.rotation.z = THREE.MathUtils.lerp(rFingerThumbTip.rotation.z, 0, 0.28);
            }

            rFingerLeft.rotation.x = THREE.MathUtils.lerp(rFingerLeft.rotation.x, 0.6, 0.28);
            rFingerLeft.rotation.y = THREE.MathUtils.lerp(rFingerLeft.rotation.y, 0, 0.28);
            rFingerLeft.rotation.z = THREE.MathUtils.lerp(rFingerLeft.rotation.z, 1.3, 0.28);
            if (rFingerLeftTip) {
              rFingerLeftTip.rotation.x = THREE.MathUtils.lerp(rFingerLeftTip.rotation.x, 0.5, 0.28);
              rFingerLeftTip.rotation.y = THREE.MathUtils.lerp(rFingerLeftTip.rotation.y, 0, 0.28);
              rFingerLeftTip.rotation.z = THREE.MathUtils.lerp(rFingerLeftTip.rotation.z, 1.1, 0.28);
            }

            rFingerRight.rotation.x = THREE.MathUtils.lerp(rFingerRight.rotation.x, 0.6, 0.28);
            rFingerRight.rotation.y = THREE.MathUtils.lerp(rFingerRight.rotation.y, 0, 0.28);
            rFingerRight.rotation.z = THREE.MathUtils.lerp(rFingerRight.rotation.z, -1.3, 0.28);
            if (rFingerRightTip) {
              rFingerRightTip.rotation.x = THREE.MathUtils.lerp(rFingerRightTip.rotation.x, 0.5, 0.28);
              rFingerRightTip.rotation.y = THREE.MathUtils.lerp(rFingerRightTip.rotation.y, 0, 0.28);
              rFingerRightTip.rotation.z = THREE.MathUtils.lerp(rFingerRightTip.rotation.z, -1.1, 0.28);
            }
          } else if (isRightActive && activeGest === "peace") {
            // Peace sign: Left and right fingers extend and spread wide, thumb curls closed tightly
            rFingerThumb.rotation.x = THREE.MathUtils.lerp(rFingerThumb.rotation.x, -1.3, 0.28);
            rFingerThumb.rotation.y = THREE.MathUtils.lerp(rFingerThumb.rotation.y, 0, 0.28);
            rFingerThumb.rotation.z = THREE.MathUtils.lerp(rFingerThumb.rotation.z, 0, 0.28);
            if (rFingerThumbTip) {
              rFingerThumbTip.rotation.x = THREE.MathUtils.lerp(rFingerThumbTip.rotation.x, -1.0, 0.28);
              rFingerThumbTip.rotation.y = THREE.MathUtils.lerp(rFingerThumbTip.rotation.y, 0, 0.28);
              rFingerThumbTip.rotation.z = THREE.MathUtils.lerp(rFingerThumbTip.rotation.z, 0, 0.28);
            }

            rFingerLeft.rotation.x = THREE.MathUtils.lerp(rFingerLeft.rotation.x, -0.1, 0.28);
            rFingerLeft.rotation.y = THREE.MathUtils.lerp(rFingerLeft.rotation.y, 0, 0.28);
            rFingerLeft.rotation.z = THREE.MathUtils.lerp(rFingerLeft.rotation.z, -0.45, 0.28);
            if (rFingerLeftTip) {
              rFingerLeftTip.rotation.x = THREE.MathUtils.lerp(rFingerLeftTip.rotation.x, 0, 0.28);
              rFingerLeftTip.rotation.y = THREE.MathUtils.lerp(rFingerLeftTip.rotation.y, 0, 0.28);
              rFingerLeftTip.rotation.z = THREE.MathUtils.lerp(rFingerLeftTip.rotation.z, -0.15, 0.28);
            }

            rFingerRight.rotation.x = THREE.MathUtils.lerp(rFingerRight.rotation.x, -0.1, 0.28);
            rFingerRight.rotation.y = THREE.MathUtils.lerp(rFingerRight.rotation.y, 0, 0.28);
            rFingerRight.rotation.z = THREE.MathUtils.lerp(rFingerRight.rotation.z, 0.45, 0.28);
            if (rFingerRightTip) {
              rFingerRightTip.rotation.x = THREE.MathUtils.lerp(rFingerRightTip.rotation.x, 0, 0.28);
              rFingerRightTip.rotation.y = THREE.MathUtils.lerp(rFingerRightTip.rotation.y, 0, 0.28);
              rFingerRightTip.rotation.z = THREE.MathUtils.lerp(rFingerRightTip.rotation.z, 0.15, 0.28);
            }
          } else if (isRightActive && activeGest === "handshake") {
            // Handshake: fingers curl slightly inward welcomingly, pulsing gently to simulate a friendly grasp
            const graspPulse = Math.sin(time * 5.0) * 0.1;
            rFingerThumb.rotation.x = THREE.MathUtils.lerp(rFingerThumb.rotation.x, -0.35 - graspPulse, 0.28);
            rFingerThumb.rotation.y = THREE.MathUtils.lerp(rFingerThumb.rotation.y, 0, 0.28);
            rFingerThumb.rotation.z = THREE.MathUtils.lerp(rFingerThumb.rotation.z, 0, 0.28);
            if (rFingerThumbTip) {
              rFingerThumbTip.rotation.x = THREE.MathUtils.lerp(rFingerThumbTip.rotation.x, -0.25 - graspPulse * 0.8, 0.28);
              rFingerThumbTip.rotation.y = THREE.MathUtils.lerp(rFingerThumbTip.rotation.y, 0, 0.28);
              rFingerThumbTip.rotation.z = THREE.MathUtils.lerp(rFingerThumbTip.rotation.z, 0, 0.28);
            }

            rFingerLeft.rotation.x = THREE.MathUtils.lerp(rFingerLeft.rotation.x, 0.2, 0.28);
            rFingerLeft.rotation.y = THREE.MathUtils.lerp(rFingerLeft.rotation.y, 0, 0.28);
            rFingerLeft.rotation.z = THREE.MathUtils.lerp(rFingerLeft.rotation.z, 0.35 + graspPulse, 0.28);
            if (rFingerLeftTip) {
              rFingerLeftTip.rotation.x = THREE.MathUtils.lerp(rFingerLeftTip.rotation.x, 0.1, 0.28);
              rFingerLeftTip.rotation.y = THREE.MathUtils.lerp(rFingerLeftTip.rotation.y, 0, 0.28);
              rFingerLeftTip.rotation.z = THREE.MathUtils.lerp(rFingerLeftTip.rotation.z, 0.25 + graspPulse * 0.8, 0.28);
            }

            rFingerRight.rotation.x = THREE.MathUtils.lerp(rFingerRight.rotation.x, 0.2, 0.28);
            rFingerRight.rotation.y = THREE.MathUtils.lerp(rFingerRight.rotation.y, 0, 0.28);
            rFingerRight.rotation.z = THREE.MathUtils.lerp(rFingerRight.rotation.z, -0.35 - graspPulse, 0.28);
            if (rFingerRightTip) {
              rFingerRightTip.rotation.x = THREE.MathUtils.lerp(rFingerRightTip.rotation.x, 0.1, 0.28);
              rFingerRightTip.rotation.y = THREE.MathUtils.lerp(rFingerRightTip.rotation.y, 0, 0.28);
              rFingerRightTip.rotation.z = THREE.MathUtils.lerp(rFingerRightTip.rotation.z, -0.25 - graspPulse * 0.8, 0.28);
            }
          } else if (isRightActive && isWavingRef.current) {
            // Highly realistic finger waving motion using physics-accurate parallel sway & whiplash delay
            // Fingers stay naturally relaxed and extended, swaying sideways together in parallel with cascading phase lag
            const sweepPhase = time * 11.0;
            const sway = Math.sin(sweepPhase - 0.6) * 0.15;
            const swayTip = Math.sin(sweepPhase - 1.2) * 0.12;

            // Subtle, gentle, natural breathing curl (X axis) rather than aggressive clawing
            const curlBase = 0.15 + Math.cos(sweepPhase - 0.4) * 0.08;
            const curlTip = 0.10 + Math.cos(sweepPhase - 1.0) * 0.06;

            // 1. Left finger: base sways parallel, tip trails behind
            rFingerLeft.rotation.x = THREE.MathUtils.lerp(rFingerLeft.rotation.x, curlBase, 0.24);
            rFingerLeft.rotation.y = THREE.MathUtils.lerp(rFingerLeft.rotation.y, 0, 0.24);
            rFingerLeft.rotation.z = THREE.MathUtils.lerp(rFingerLeft.rotation.z, 0.25 + sway, 0.24);
            if (rFingerLeftTip) {
              rFingerLeftTip.rotation.x = THREE.MathUtils.lerp(rFingerLeftTip.rotation.x, curlTip, 0.24);
              rFingerLeftTip.rotation.y = THREE.MathUtils.lerp(rFingerLeftTip.rotation.y, 0, 0.24);
              rFingerLeftTip.rotation.z = THREE.MathUtils.lerp(rFingerLeftTip.rotation.z, 0.15 + swayTip, 0.24);
            }

            // 2. Right finger: base sways parallel, tip trails behind
            rFingerRight.rotation.x = THREE.MathUtils.lerp(rFingerRight.rotation.x, curlBase, 0.24);
            rFingerRight.rotation.y = THREE.MathUtils.lerp(rFingerRight.rotation.y, 0, 0.24);
            rFingerRight.rotation.z = THREE.MathUtils.lerp(rFingerRight.rotation.z, -0.25 + sway, 0.24);
            if (rFingerRightTip) {
              rFingerRightTip.rotation.x = THREE.MathUtils.lerp(rFingerRightTip.rotation.x, curlTip, 0.24);
              rFingerRightTip.rotation.y = THREE.MathUtils.lerp(rFingerRightTip.rotation.y, 0, 0.24);
              rFingerRightTip.rotation.z = THREE.MathUtils.lerp(rFingerRightTip.rotation.z, -0.15 + swayTip, 0.24);
            }

            // 3. Thumb: sways parallel, tip trails behind
            rFingerThumb.rotation.x = THREE.MathUtils.lerp(rFingerThumb.rotation.x, -0.1 + Math.cos(sweepPhase - 0.4) * 0.08, 0.24);
            rFingerThumb.rotation.y = THREE.MathUtils.lerp(rFingerThumb.rotation.y, 0, 0.24);
            rFingerThumb.rotation.z = THREE.MathUtils.lerp(rFingerThumb.rotation.z, sway * 0.8, 0.24);
            if (rFingerThumbTip) {
              rFingerThumbTip.rotation.x = THREE.MathUtils.lerp(rFingerThumbTip.rotation.x, -0.1 + Math.cos(sweepPhase - 1.0) * 0.06, 0.24);
              rFingerThumbTip.rotation.y = THREE.MathUtils.lerp(rFingerThumbTip.rotation.y, 0, 0.24);
              rFingerThumbTip.rotation.z = THREE.MathUtils.lerp(rFingerThumbTip.rotation.z, swayTip * 0.8, 0.24);
            }
          } else if (isRightActive && activeGest === "stop") {
            // Flat, statically spread stop hand
            rFingerThumb.rotation.x = THREE.MathUtils.lerp(rFingerThumb.rotation.x, 0.5, 0.28);
            rFingerThumb.rotation.y = THREE.MathUtils.lerp(rFingerThumb.rotation.y, 0, 0.28);
            rFingerThumb.rotation.z = THREE.MathUtils.lerp(rFingerThumb.rotation.z, 0, 0.28);
            if (rFingerThumbTip) {
              rFingerThumbTip.rotation.set(0, 0, 0);
            }

            rFingerLeft.rotation.x = THREE.MathUtils.lerp(rFingerLeft.rotation.x, 0, 0.28);
            rFingerLeft.rotation.y = THREE.MathUtils.lerp(rFingerLeft.rotation.y, 0, 0.28);
            rFingerLeft.rotation.z = THREE.MathUtils.lerp(rFingerLeft.rotation.z, -0.45, 0.28);
            if (rFingerLeftTip) {
              rFingerLeftTip.rotation.set(0, 0, 0);
            }

            rFingerRight.rotation.x = THREE.MathUtils.lerp(rFingerRight.rotation.x, 0, 0.28);
            rFingerRight.rotation.y = THREE.MathUtils.lerp(rFingerRight.rotation.y, 0, 0.28);
            rFingerRight.rotation.z = THREE.MathUtils.lerp(rFingerRight.rotation.z, 0.45, 0.28);
            if (rFingerRightTip) {
              rFingerRightTip.rotation.set(0, 0, 0);
            }
          } else {
            // Idle relaxed slightly curved natural state
            rFingerThumb.rotation.x = THREE.MathUtils.lerp(rFingerThumb.rotation.x, -0.1, 0.18);
            rFingerThumb.rotation.y = THREE.MathUtils.lerp(rFingerThumb.rotation.y, 0, 0.18);
            rFingerThumb.rotation.z = THREE.MathUtils.lerp(rFingerThumb.rotation.z, 0, 0.18);
            if (rFingerThumbTip) {
              rFingerThumbTip.rotation.x = THREE.MathUtils.lerp(rFingerThumbTip.rotation.x, -0.1, 0.18);
              rFingerThumbTip.rotation.y = THREE.MathUtils.lerp(rFingerThumbTip.rotation.y, 0, 0.18);
              rFingerThumbTip.rotation.z = THREE.MathUtils.lerp(rFingerThumbTip.rotation.z, 0, 0.18);
            }

            rFingerLeft.rotation.x = THREE.MathUtils.lerp(rFingerLeft.rotation.x, 0.1, 0.18);
            rFingerLeft.rotation.y = THREE.MathUtils.lerp(rFingerLeft.rotation.y, 0, 0.18);
            rFingerLeft.rotation.z = THREE.MathUtils.lerp(rFingerLeft.rotation.z, 0.25, 0.18);
            if (rFingerLeftTip) {
              rFingerLeftTip.rotation.x = THREE.MathUtils.lerp(rFingerLeftTip.rotation.x, 0.05, 0.18);
              rFingerLeftTip.rotation.y = THREE.MathUtils.lerp(rFingerLeftTip.rotation.y, 0, 0.18);
              rFingerLeftTip.rotation.z = THREE.MathUtils.lerp(rFingerLeftTip.rotation.z, 0.15, 0.18);
            }

            rFingerRight.rotation.x = THREE.MathUtils.lerp(rFingerRight.rotation.x, 0.1, 0.18);
            rFingerRight.rotation.y = THREE.MathUtils.lerp(rFingerRight.rotation.y, 0, 0.18);
            rFingerRight.rotation.z = THREE.MathUtils.lerp(rFingerRight.rotation.z, -0.25, 0.18);
            if (rFingerRightTip) {
              rFingerRightTip.rotation.x = THREE.MathUtils.lerp(rFingerRightTip.rotation.x, 0.05, 0.18);
              rFingerRightTip.rotation.y = THREE.MathUtils.lerp(rFingerRightTip.rotation.y, 0, 0.18);
              rFingerRightTip.rotation.z = THREE.MathUtils.lerp(rFingerRightTip.rotation.z, -0.15, 0.18);
            }
          }
        }

        // Lerp left hand fingers based on current gesture
        if (lFingerLeft && lFingerRight && lFingerThumb) {
          const isLeftActive = activeArm === "left" || activeGest === "stop";
          if (isLeftActive && activeGest === "thumbsup") {
            // Thumbs up: Thumb points straight up/out, other fingers curl closed tightly
            lFingerThumb.rotation.x = THREE.MathUtils.lerp(lFingerThumb.rotation.x, 0.6, 0.28);
            lFingerThumb.rotation.y = THREE.MathUtils.lerp(lFingerThumb.rotation.y, 0, 0.28);
            lFingerThumb.rotation.z = THREE.MathUtils.lerp(lFingerThumb.rotation.z, 0, 0.28);
            if (lFingerThumbTip) {
              lFingerThumbTip.rotation.x = THREE.MathUtils.lerp(lFingerThumbTip.rotation.x, 0.1, 0.28);
              lFingerThumbTip.rotation.y = THREE.MathUtils.lerp(lFingerThumbTip.rotation.y, 0, 0.28);
              lFingerThumbTip.rotation.z = THREE.MathUtils.lerp(lFingerThumbTip.rotation.z, 0, 0.28);
            }

            lFingerLeft.rotation.x = THREE.MathUtils.lerp(lFingerLeft.rotation.x, 0.6, 0.28);
            lFingerLeft.rotation.y = THREE.MathUtils.lerp(lFingerLeft.rotation.y, 0, 0.28);
            lFingerLeft.rotation.z = THREE.MathUtils.lerp(lFingerLeft.rotation.z, 1.3, 0.28);
            if (lFingerLeftTip) {
              lFingerLeftTip.rotation.x = THREE.MathUtils.lerp(lFingerLeftTip.rotation.x, 0.5, 0.28);
              lFingerLeftTip.rotation.y = THREE.MathUtils.lerp(lFingerLeftTip.rotation.y, 0, 0.28);
              lFingerLeftTip.rotation.z = THREE.MathUtils.lerp(lFingerLeftTip.rotation.z, 1.1, 0.28);
            }

            lFingerRight.rotation.x = THREE.MathUtils.lerp(lFingerRight.rotation.x, 0.6, 0.28);
            lFingerRight.rotation.y = THREE.MathUtils.lerp(lFingerRight.rotation.y, 0, 0.28);
            lFingerRight.rotation.z = THREE.MathUtils.lerp(lFingerRight.rotation.z, -1.3, 0.28);
            if (lFingerRightTip) {
              lFingerRightTip.rotation.x = THREE.MathUtils.lerp(lFingerRightTip.rotation.x, 0.5, 0.28);
              lFingerRightTip.rotation.y = THREE.MathUtils.lerp(lFingerRightTip.rotation.y, 0, 0.28);
              lFingerRightTip.rotation.z = THREE.MathUtils.lerp(lFingerRightTip.rotation.z, -1.1, 0.28);
            }
          } else if (isLeftActive && activeGest === "peace") {
            // Peace sign: Left and right fingers extend and spread wide, thumb curls closed tightly
            lFingerThumb.rotation.x = THREE.MathUtils.lerp(lFingerThumb.rotation.x, -1.3, 0.28);
            lFingerThumb.rotation.y = THREE.MathUtils.lerp(lFingerThumb.rotation.y, 0, 0.28);
            lFingerThumb.rotation.z = THREE.MathUtils.lerp(lFingerThumb.rotation.z, 0, 0.28);
            if (lFingerThumbTip) {
              lFingerThumbTip.rotation.x = THREE.MathUtils.lerp(lFingerThumbTip.rotation.x, -1.0, 0.28);
              lFingerThumbTip.rotation.y = THREE.MathUtils.lerp(lFingerThumbTip.rotation.y, 0, 0.28);
              lFingerThumbTip.rotation.z = THREE.MathUtils.lerp(lFingerThumbTip.rotation.z, 0, 0.28);
            }

            lFingerLeft.rotation.x = THREE.MathUtils.lerp(lFingerLeft.rotation.x, -0.1, 0.28);
            lFingerLeft.rotation.y = THREE.MathUtils.lerp(lFingerLeft.rotation.y, 0, 0.28);
            lFingerLeft.rotation.z = THREE.MathUtils.lerp(lFingerLeft.rotation.z, -0.45, 0.28);
            if (lFingerLeftTip) {
              lFingerLeftTip.rotation.x = THREE.MathUtils.lerp(lFingerLeftTip.rotation.x, 0, 0.28);
              lFingerLeftTip.rotation.y = THREE.MathUtils.lerp(lFingerLeftTip.rotation.y, 0, 0.28);
              lFingerLeftTip.rotation.z = THREE.MathUtils.lerp(lFingerLeftTip.rotation.z, -0.15, 0.28);
            }

            lFingerRight.rotation.x = THREE.MathUtils.lerp(lFingerRight.rotation.x, -0.1, 0.28);
            lFingerRight.rotation.y = THREE.MathUtils.lerp(lFingerRight.rotation.y, 0, 0.28);
            lFingerRight.rotation.z = THREE.MathUtils.lerp(lFingerRight.rotation.z, 0.45, 0.28);
            if (lFingerRightTip) {
              lFingerRightTip.rotation.x = THREE.MathUtils.lerp(lFingerRightTip.rotation.x, 0, 0.28);
              lFingerRightTip.rotation.y = THREE.MathUtils.lerp(lFingerRightTip.rotation.y, 0, 0.28);
              lFingerRightTip.rotation.z = THREE.MathUtils.lerp(lFingerRightTip.rotation.z, 0.15, 0.28);
            }
          } else if (isLeftActive && activeGest === "handshake") {
            // Handshake: fingers curl slightly inward welcomingly, pulsing gently to simulate a friendly grasp
            const graspPulse = Math.sin(time * 5.0) * 0.1;
            lFingerThumb.rotation.x = THREE.MathUtils.lerp(lFingerThumb.rotation.x, -0.35 - graspPulse, 0.28);
            lFingerThumb.rotation.y = THREE.MathUtils.lerp(lFingerThumb.rotation.y, 0, 0.28);
            lFingerThumb.rotation.z = THREE.MathUtils.lerp(lFingerThumb.rotation.z, 0, 0.28);
            if (lFingerThumbTip) {
              lFingerThumbTip.rotation.x = THREE.MathUtils.lerp(lFingerThumbTip.rotation.x, -0.25 - graspPulse * 0.8, 0.28);
              lFingerThumbTip.rotation.y = THREE.MathUtils.lerp(lFingerThumbTip.rotation.y, 0, 0.28);
              lFingerThumbTip.rotation.z = THREE.MathUtils.lerp(lFingerThumbTip.rotation.z, 0, 0.28);
            }

            lFingerLeft.rotation.x = THREE.MathUtils.lerp(lFingerLeft.rotation.x, 0.2, 0.28);
            lFingerLeft.rotation.y = THREE.MathUtils.lerp(lFingerLeft.rotation.y, 0, 0.28);
            lFingerLeft.rotation.z = THREE.MathUtils.lerp(lFingerLeft.rotation.z, 0.35 + graspPulse, 0.28);
            if (lFingerLeftTip) {
              lFingerLeftTip.rotation.x = THREE.MathUtils.lerp(lFingerLeftTip.rotation.x, 0.1, 0.28);
              lFingerLeftTip.rotation.y = THREE.MathUtils.lerp(lFingerLeftTip.rotation.y, 0, 0.28);
              lFingerLeftTip.rotation.z = THREE.MathUtils.lerp(lFingerLeftTip.rotation.z, 0.25 + graspPulse * 0.8, 0.28);
            }

            lFingerRight.rotation.x = THREE.MathUtils.lerp(lFingerRight.rotation.x, 0.2, 0.28);
            lFingerRight.rotation.y = THREE.MathUtils.lerp(lFingerRight.rotation.y, 0, 0.28);
            lFingerRight.rotation.z = THREE.MathUtils.lerp(lFingerRight.rotation.z, -0.35 - graspPulse, 0.28);
            if (lFingerRightTip) {
              lFingerRightTip.rotation.x = THREE.MathUtils.lerp(lFingerRightTip.rotation.x, 0.1, 0.28);
              lFingerRightTip.rotation.y = THREE.MathUtils.lerp(lFingerRightTip.rotation.y, 0, 0.28);
              lFingerRightTip.rotation.z = THREE.MathUtils.lerp(lFingerRightTip.rotation.z, -0.25 - graspPulse * 0.8, 0.28);
            }
          } else if (isLeftActive && isWavingRef.current) {
            // Highly realistic finger waving motion using physics-accurate parallel sway & whiplash delay
            // Fingers stay naturally relaxed and extended, swaying sideways together in parallel with cascading phase lag
            const sweepPhase = time * 11.0;
            const sway = Math.sin(sweepPhase - 0.6) * 0.15;
            const swayTip = Math.sin(sweepPhase - 1.2) * 0.12;

            // Subtle, gentle, natural breathing curl (X axis) rather than aggressive clawing
            const curlBase = 0.15 + Math.cos(sweepPhase - 0.4) * 0.08;
            const curlTip = 0.10 + Math.cos(sweepPhase - 1.0) * 0.06;

            // 1. Left finger: base sways parallel, tip trails behind
            lFingerLeft.rotation.x = THREE.MathUtils.lerp(lFingerLeft.rotation.x, curlBase, 0.24);
            lFingerLeft.rotation.y = THREE.MathUtils.lerp(lFingerLeft.rotation.y, 0, 0.24);
            lFingerLeft.rotation.z = THREE.MathUtils.lerp(lFingerLeft.rotation.z, 0.25 + sway, 0.24);
            if (lFingerLeftTip) {
              lFingerLeftTip.rotation.x = THREE.MathUtils.lerp(lFingerLeftTip.rotation.x, curlTip, 0.24);
              lFingerLeftTip.rotation.y = THREE.MathUtils.lerp(lFingerLeftTip.rotation.y, 0, 0.24);
              lFingerLeftTip.rotation.z = THREE.MathUtils.lerp(lFingerLeftTip.rotation.z, 0.15 + swayTip, 0.24);
            }

            // 2. Right finger: base sways parallel, tip trails behind
            lFingerRight.rotation.x = THREE.MathUtils.lerp(lFingerRight.rotation.x, curlBase, 0.24);
            lFingerRight.rotation.y = THREE.MathUtils.lerp(lFingerRight.rotation.y, 0, 0.24);
            lFingerRight.rotation.z = THREE.MathUtils.lerp(lFingerRight.rotation.z, -0.25 + sway, 0.24);
            if (lFingerRightTip) {
              lFingerRightTip.rotation.x = THREE.MathUtils.lerp(lFingerRightTip.rotation.x, curlTip, 0.24);
              lFingerRightTip.rotation.y = THREE.MathUtils.lerp(lFingerRightTip.rotation.y, 0, 0.24);
              lFingerRightTip.rotation.z = THREE.MathUtils.lerp(lFingerRightTip.rotation.z, -0.15 + swayTip, 0.24);
            }

            // 3. Thumb: sways parallel, tip trails behind
            lFingerThumb.rotation.x = THREE.MathUtils.lerp(lFingerThumb.rotation.x, -0.1 + Math.cos(sweepPhase - 0.4) * 0.08, 0.24);
            lFingerThumb.rotation.y = THREE.MathUtils.lerp(lFingerThumb.rotation.y, 0, 0.24);
            lFingerThumb.rotation.z = THREE.MathUtils.lerp(lFingerThumb.rotation.z, sway * 0.8, 0.24);
            if (lFingerThumbTip) {
              lFingerThumbTip.rotation.x = THREE.MathUtils.lerp(lFingerThumbTip.rotation.x, -0.1 + Math.cos(sweepPhase - 1.0) * 0.06, 0.24);
              lFingerThumbTip.rotation.y = THREE.MathUtils.lerp(lFingerThumbTip.rotation.y, 0, 0.24);
              lFingerThumbTip.rotation.z = THREE.MathUtils.lerp(lFingerThumbTip.rotation.z, swayTip * 0.8, 0.24);
            }
          } else if (isLeftActive && activeGest === "stop") {
            // Flat, statically spread stop hand
            lFingerThumb.rotation.x = THREE.MathUtils.lerp(lFingerThumb.rotation.x, 0.5, 0.28);
            lFingerThumb.rotation.y = THREE.MathUtils.lerp(lFingerThumb.rotation.y, 0, 0.28);
            lFingerThumb.rotation.z = THREE.MathUtils.lerp(lFingerThumb.rotation.z, 0, 0.28);
            if (lFingerThumbTip) {
              lFingerThumbTip.rotation.set(0, 0, 0);
            }

            lFingerLeft.rotation.x = THREE.MathUtils.lerp(lFingerLeft.rotation.x, 0, 0.28);
            lFingerLeft.rotation.y = THREE.MathUtils.lerp(lFingerLeft.rotation.y, 0, 0.28);
            lFingerLeft.rotation.z = THREE.MathUtils.lerp(lFingerLeft.rotation.z, -0.45, 0.28);
            if (lFingerLeftTip) {
              lFingerLeftTip.rotation.set(0, 0, 0);
            }

            lFingerRight.rotation.x = THREE.MathUtils.lerp(lFingerRight.rotation.x, 0, 0.28);
            lFingerRight.rotation.y = THREE.MathUtils.lerp(lFingerRight.rotation.y, 0, 0.28);
            lFingerRight.rotation.z = THREE.MathUtils.lerp(lFingerRight.rotation.z, 0.45, 0.28);
            if (lFingerRightTip) {
              lFingerRightTip.rotation.set(0, 0, 0);
            }
          } else {
            // Idle relaxed slightly curved natural state
            lFingerThumb.rotation.x = THREE.MathUtils.lerp(lFingerThumb.rotation.x, -0.1, 0.18);
            lFingerThumb.rotation.y = THREE.MathUtils.lerp(lFingerThumb.rotation.y, 0, 0.18);
            lFingerThumb.rotation.z = THREE.MathUtils.lerp(lFingerThumb.rotation.z, 0, 0.18);
            if (lFingerThumbTip) {
              lFingerThumbTip.rotation.x = THREE.MathUtils.lerp(lFingerThumbTip.rotation.x, -0.1, 0.18);
              lFingerThumbTip.rotation.y = THREE.MathUtils.lerp(lFingerThumbTip.rotation.y, 0, 0.18);
              lFingerThumbTip.rotation.z = THREE.MathUtils.lerp(lFingerThumbTip.rotation.z, 0, 0.18);
            }

            lFingerLeft.rotation.x = THREE.MathUtils.lerp(lFingerLeft.rotation.x, 0.1, 0.18);
            lFingerLeft.rotation.y = THREE.MathUtils.lerp(lFingerLeft.rotation.y, 0, 0.18);
            lFingerLeft.rotation.z = THREE.MathUtils.lerp(lFingerLeft.rotation.z, 0.25, 0.18);
            if (lFingerLeftTip) {
              lFingerLeftTip.rotation.x = THREE.MathUtils.lerp(lFingerLeftTip.rotation.x, 0.05, 0.18);
              lFingerLeftTip.rotation.y = THREE.MathUtils.lerp(lFingerLeftTip.rotation.y, 0, 0.18);
              lFingerLeftTip.rotation.z = THREE.MathUtils.lerp(lFingerLeftTip.rotation.z, 0.15, 0.18);
            }

            lFingerRight.rotation.x = THREE.MathUtils.lerp(lFingerRight.rotation.x, 0.1, 0.18);
            lFingerRight.rotation.y = THREE.MathUtils.lerp(lFingerRight.rotation.y, 0, 0.18);
            lFingerRight.rotation.z = THREE.MathUtils.lerp(lFingerRight.rotation.z, -0.25, 0.18);
            if (lFingerRightTip) {
              lFingerRightTip.rotation.x = THREE.MathUtils.lerp(lFingerRightTip.rotation.x, 0.05, 0.18);
              lFingerRightTip.rotation.y = THREE.MathUtils.lerp(lFingerRightTip.rotation.y, 0, 0.18);
              lFingerRightTip.rotation.z = THREE.MathUtils.lerp(lFingerRightTip.rotation.z, -0.15, 0.18);
            }
          }
        }



        // F. Eye Blinking Logic
        let blinkFactor = 1.0;
        const now = time;
        if (!isBlinking && now - lastBlinkTime > blinkInterval) {
          isBlinking = true;
          lastBlinkTime = now;
          blinkInterval = 2.0 + Math.random() * 5.0; // randomize next blink time
        }

        if (isBlinking) {
          const progress = (now - lastBlinkTime) / blinkDuration;
          if (progress >= 1.0) {
            isBlinking = false;
            blinkFactor = 1.0;
          } else {
            // sine curve for smooth closing/opening
            blinkFactor = Math.abs(Math.sin(progress * Math.PI - Math.PI / 2));
          }
        }

        // G. Update face canvas drawing
        updateFaceCanvas(time, blinkFactor);

        // H. Render
        renderer.render(scene, camera);
      };

      animate();

      // 9. Resize Container Handler
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width: w, height: h } = entry.contentRect;
          if (w === 0 || h === 0) continue;
          
          const aspect = w / h;
          camera.aspect = aspect;
          
          // Dynamically adjust camera distance and height based on aspect ratio to guarantee entire robot fits perfectly
          if (aspect < 1.0) {
            // Narrow / Portrait screen (e.g. mobile or narrow panel): push camera back and adjust lookAt
            camera.position.z = 8.5 + (1.0 - aspect) * 2.2;
            camera.position.y = 0.25 + (1.0 - aspect) * 0.4;
            camera.lookAt(0, -0.35 - (1.0 - aspect) * 0.2, 0);
          } else {
            // Wide / Landscape screen: keep standard optimized framing to fit perfectly between overlays
            camera.position.z = 8.5;
            camera.position.y = 0.15;
            camera.lookAt(0, -0.35, 0);
          }
          
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      });
      resizeObserver.observe(container);

      // On startup play beautiful startup synthesizer chime
      playSynthSound("startup");

      // Cleanup
      return () => {
        cancelAnimationFrame(animationFrameId);
        resizeObserver.disconnect();
        container.removeChild(renderer.domElement);
        renderer.dispose();
        faceTexture.dispose();
        helmetGeom.dispose();
        screenGeom.dispose();
        earGeom.dispose();
        earRingGeom.dispose();
        torsoGeom.dispose();
        coreRingGeom.dispose();
        shoulderGeom.dispose();
        armSegmentGeom.dispose();
        palmGeom.dispose();
        fingerBaseGeom.dispose();
        fingerTipGeom.dispose();
        palmGlowGeom.dispose();
        underglowRingGeom.dispose();
        starsGeom.dispose();
        accentMaterial.dispose();
        glossyMaterial.dispose();
        screenMaterial.dispose();
        glowMaterial.dispose();
        starMaterial.dispose();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
        {/* The WebGL Canvas Container -- fully transparent so the page's own
            .space-bg shows through with no seam/rectangle around the robot. */}
        <div ref={containerRef} className="w-full h-full absolute inset-0 z-0" />

        {/* Outer glowing floor marker -- subtle, no opaque backing box */}
        <div className="absolute bottom-[24%] left-1/2 -translate-x-1/2 w-[340px] h-[50px] bg-slate-400/10 blur-[40px] rounded-full pointer-events-none -z-10" />
      </div>
    );
  }
);

RobotViewer.displayName = "RobotViewer";
