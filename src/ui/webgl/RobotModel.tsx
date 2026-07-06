"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

// Declare JSX elements for Three.js in both global and react namespaces to cover all compiler modes
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      sphereGeometry: any;
      tubeGeometry: any;
      cylinderGeometry: any;
      boxGeometry: any;
      capsuleGeometry: any;
      torusGeometry: any;
    }
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      sphereGeometry: any;
      tubeGeometry: any;
      cylinderGeometry: any;
      boxGeometry: any;
      capsuleGeometry: any;
      torusGeometry: any;
    }
  }
}

interface RobotModelProps {
  theme?: "dark" | "light";
  emissiveColor?: string;
  emissiveIntensity?: number;
  bodyColor?: string;
  position?: [number, number, number] | THREE.Vector3;
  rotation?: [number, number, number] | THREE.Euler;
  scale?: [number, number, number] | THREE.Vector3 | number;
  children?: React.ReactNode;
}

export default function RobotModel({
  theme = "dark",
  emissiveColor = "#7fd7ff",
  emissiveIntensity = 3.0,
  bodyColor,
  ...props
}: RobotModelProps) {
  // 1. Body Material setup (MeshPhysicalMaterial)
  const defaultBodyColor = theme === "light" ? "#f8fafc" : "#0a0d14";
  const resolvedBodyColor = bodyColor || defaultBodyColor;

  const bodyMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(resolvedBodyColor),
      roughness: 0.25,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.15,
    });
  }, [resolvedBodyColor]);

  // 2. Glow Material setup (MeshStandardMaterial with high emissive intensity)
  const glowMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color("#eaf6ff"),
      emissive: new THREE.Color(emissiveColor),
      emissiveIntensity: emissiveIntensity,
      roughness: 0.4,
    });
  }, [emissiveColor, emissiveIntensity]);

  // 3. Mathematical generation of perfectly projected facial curves (smiling eyes and mouth)
  const leftEyeCurve = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const R_glow = 1.015; // Placed slightly above the sphere's radius (1.0) to eliminate Z-fighting
    const center_azimuth = -0.28; // Radians (~ -16 deg)
    const half_width = 0.12;
    const center_polar = 1.38; // Radians (slightly above equator = 1.57)
    const arc_height = 0.04;

    for (let i = 0; i <= 8; i++) {
      const t = (i / 8) * 2 - 1; // From -1 to 1
      const azimuth = center_azimuth + t * half_width;
      const polar = center_polar - (1 - t * t) * arc_height; // Smiling eye curve (⌒ shape)

      const x = R_glow * Math.sin(polar) * Math.sin(azimuth);
      const y = R_glow * Math.cos(polar);
      const z = R_glow * Math.sin(polar) * Math.cos(azimuth);
      points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(points);
  }, []);

  const rightEyeCurve = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const R_glow = 1.015;
    const center_azimuth = 0.28; // Radians (~ 16 deg)
    const half_width = 0.12;
    const center_polar = 1.38;
    const arc_height = 0.04;

    for (let i = 0; i <= 8; i++) {
      const t = (i / 8) * 2 - 1;
      const azimuth = center_azimuth + t * half_width;
      const polar = center_polar - (1 - t * t) * arc_height; // Smiling eye curve (⌒ shape)

      const x = R_glow * Math.sin(polar) * Math.sin(azimuth);
      const y = R_glow * Math.cos(polar);
      const z = R_glow * Math.sin(polar) * Math.cos(azimuth);
      points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(points);
  }, []);

  const mouthCurve = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const R_glow = 1.015;
    const center_azimuth = 0.0;
    const half_width = 0.22;
    const center_polar = 1.74; // Radians (slightly below equator = 1.57)
    const arc_height = 0.06;

    for (let i = 0; i <= 8; i++) {
      const t = (i / 8) * 2 - 1;
      const azimuth = center_azimuth + t * half_width;
      const polar = center_polar + (1 - t * t) * arc_height; // Happy smile curve (⌣ shape)

      const x = R_glow * Math.sin(polar) * Math.sin(azimuth);
      const y = R_glow * Math.cos(polar);
      const z = R_glow * Math.sin(polar) * Math.cos(azimuth);
      points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(points);
  }, []);

  // Helper arrays of Vector3 points for tube endcaps
  const leftEyePoints = useMemo(() => leftEyeCurve.getPoints(8), [leftEyeCurve]);
  const rightEyePoints = useMemo(() => rightEyeCurve.getPoints(8), [rightEyeCurve]);
  const mouthPoints = useMemo(() => mouthCurve.getPoints(8), [mouthCurve]);

  return (
    <group {...props} name="robotModelGroup">
      {/* 4. Head Group (flattens head, eyes, mouth, and ears together for seamless look) */}
      <group name="headGroup" position={[0, 0.85, 0]} scale={[1.22, 0.94, 1.1]}>
        {/* headMesh: Smooth slightly flattened Sphere helmet */}
        <mesh name="headMesh" material={bodyMaterial}>
          <sphereGeometry args={[1.0, 64, 64]} />
        </mesh>

        {/* faceLines: Glowing embedded curved tube meshes with clean rounded cap spheres */}
        <group name="faceLines">
          {/* leftEye */}
          <mesh name="leftEye" material={glowMaterial}>
            <tubeGeometry args={[leftEyeCurve, 32, 0.024, 12, false]} />
          </mesh>
          <mesh name="leftEyeCapStart" position={leftEyePoints[0]} material={glowMaterial}>
            <sphereGeometry args={[0.024, 16, 16]} />
          </mesh>
          <mesh name="leftEyeCapEnd" position={leftEyePoints[leftEyePoints.length - 1]} material={glowMaterial}>
            <sphereGeometry args={[0.024, 16, 16]} />
          </mesh>

          {/* rightEye */}
          <mesh name="rightEye" material={glowMaterial}>
            <tubeGeometry args={[rightEyeCurve, 32, 0.024, 12, false]} />
          </mesh>
          <mesh name="rightEyeCapStart" position={rightEyePoints[0]} material={glowMaterial}>
            <sphereGeometry args={[0.024, 16, 16]} />
          </mesh>
          <mesh name="rightEyeCapEnd" position={rightEyePoints[rightEyePoints.length - 1]} material={glowMaterial}>
            <sphereGeometry args={[0.024, 16, 16]} />
          </mesh>

          {/* mouthMesh */}
          <mesh name="mouthMesh" material={glowMaterial}>
            <tubeGeometry args={[mouthCurve, 32, 0.024, 12, false]} />
          </mesh>
          <mesh name="mouthCapStart" position={mouthPoints[0]} material={glowMaterial}>
            <sphereGeometry args={[0.024, 16, 16]} />
          </mesh>
          <mesh name="mouthCapEnd" position={mouthPoints[mouthPoints.length - 1]} material={glowMaterial}>
            <sphereGeometry args={[0.024, 16, 16]} />
          </mesh>
        </group>

        {/* leftEar Pod & glowing strip */}
        <group name="leftEar" position={[-1.0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <mesh material={bodyMaterial}>
            <cylinderGeometry args={[0.18, 0.18, 0.15, 48]} />
          </mesh>
          <mesh name="leftEarGlowStrip" position={[0, -0.08, 0]} material={glowMaterial}>
            <boxGeometry args={[0.02, 0.01, 0.2]} />
          </mesh>
        </group>

        {/* rightEar Pod & glowing strip */}
        <group name="rightEar" position={[1.0, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <mesh material={bodyMaterial}>
            <cylinderGeometry args={[0.18, 0.18, 0.15, 48]} />
          </mesh>
          <mesh name="rightEarGlowStrip" position={[0, -0.08, 0]} material={glowMaterial}>
            <boxGeometry args={[0.02, 0.01, 0.2]} />
          </mesh>
        </group>
      </group>

      {/* 5. Torso Group (Floating and perfectly smoothed at the bottom) */}
      <group name="torsoGroup" position={[0, -0.45, 0]}>
        {/* torsoMesh: rounded capsule shape */}
        <mesh name="torsoMesh" material={bodyMaterial}>
          <capsuleGeometry args={[0.62, 0.75, 24, 48]} />
        </mesh>

        {/* chestRing: Glowing ring on upper front chest */}
        <mesh name="chestRing" position={[0, 0.22, 0.60]} rotation={[0.12, 0, 0]} material={glowMaterial}>
          <torusGeometry args={[0.17, 0.025, 16, 64]} />
        </mesh>
      </group>

      {/* 6. Arms Group (Short, cute rounded stubs angled outwards) */}
      <group name="leftArm" position={[-0.75, -0.65, 0.0]} rotation={[0, 0, 0.42]}>
        <mesh name="leftArmMesh" material={bodyMaterial}>
          <capsuleGeometry args={[0.16, 0.32, 16, 32]} />
        </mesh>
      </group>

      <group name="rightArm" position={[0.75, -0.65, 0.0]} rotation={[0, 0, -0.42]}>
        <mesh name="rightArmMesh" material={bodyMaterial}>
          <capsuleGeometry args={[0.16, 0.32, 16, 32]} />
        </mesh>
      </group>
    </group>
  );
}
