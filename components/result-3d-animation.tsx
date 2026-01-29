"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import * as THREE from "three";

function FloatingDocument({ position, rotation, color, scale = 1 }: { position: [number, number, number], rotation: [number, number, number], color: string, scale?: number }) {
    const meshRef = useRef<THREE.Mesh>(null!);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        // Gentle floating motion
        meshRef.current.position.y = position[1] + Math.sin(time + position[0]) * 0.1;
        // Slow rotation
        meshRef.current.rotation.x = rotation[0] + Math.sin(time * 0.5) * 0.1;
        meshRef.current.rotation.y = rotation[1] + time * 0.2;
    });

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
                {/* Document shape - slightly thin box */}
                <boxGeometry args={[1.2, 1.6, 0.1]} />
                <meshStandardMaterial
                    color={color}
                    roughness={0.3}
                    metalness={0.1}
                    transparent
                    opacity={0.9}
                />
                {/* Lines representing text */}
                <group position={[0, 0, 0.06]}>
                    <mesh position={[0, 0.4, 0]}>
                        <planeGeometry args={[0.8, 0.1]} />
                        <meshBasicMaterial color="white" opacity={0.6} transparent />
                    </mesh>
                    <mesh position={[0, 0.1, 0]}>
                        <planeGeometry args={[0.8, 0.05]} />
                        <meshBasicMaterial color="white" opacity={0.4} transparent />
                    </mesh>
                    <mesh position={[0, -0.1, 0]}>
                        <planeGeometry args={[0.8, 0.05]} />
                        <meshBasicMaterial color="white" opacity={0.4} transparent />
                    </mesh>
                    <mesh position={[0, -0.3, 0]}>
                        <planeGeometry args={[0.6, 0.05]} />
                        <meshBasicMaterial color="white" opacity={0.4} transparent />
                    </mesh>
                </group>
            </mesh>
        </Float>
    );
}

function Checkmark({ position }: { position: [number, number, number] }) {
    const groupRef = useRef<THREE.Group>(null!);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        groupRef.current.rotation.y = time * 0.5;
        groupRef.current.position.y = position[1] + Math.sin(time * 2) * 0.1;
    });

    return (
        <group ref={groupRef} position={position}>
            {/* Circle background */}
            <mesh>
                <sphereGeometry args={[0.4, 32, 32]} />
                <meshStandardMaterial color="#22c55e" roughness={0.2} metalness={0.1} />
            </mesh>
            {/* Checkmark shape simplified */}
            <mesh position={[0, 0, 0.35]}>
                <torusGeometry args={[0.2, 0.04, 16, 100]} />
                <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
            </mesh>
        </group>
    )
}


export function Result3DAnimation() {
    return (
        <div className="w-full h-[400px] sm:h-[500px] relative pointer-events-none">
            <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
                <ambientLight intensity={0.7} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
                <pointLight position={[-10, -10, -10]} intensity={1} />

                <Environment preset="city" />

                {/* Central Document */}
                <FloatingDocument
                    position={[0, 0, 0]}
                    rotation={[0.2, -0.2, 0]}
                    color="#3b82f6" // Blue
                    scale={1.2}
                />

                {/* Background Documents */}
                <FloatingDocument
                    position={[-2.5, 1, -2]}
                    rotation={[-0.2, 0.4, 0.1]}
                    color="#e2e8f0" // Light gray
                    scale={0.8}
                />
                <FloatingDocument
                    position={[2.5, -1, -1]}
                    rotation={[0.1, -0.5, -0.1]}
                    color="#cbd5e1" // Gray
                    scale={0.9}
                />

                {/* Floating Checkmarks indicating validation */}
                <Checkmark position={[1.5, 1.5, 1]} />
                <Checkmark position={[-1.5, -1.2, 0.5]} />

            </Canvas>
        </div>
    );
}
