'use client';

import { useEffect, useRef, useState } from 'react';
import type { PostWithTags } from '@/lib/db/queries';
import PostCard from './PostCard';

interface Props {
    posts: PostWithTags[];
}

export default function PostSpace({ posts }: Props) {
    const sceneRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted || !sceneRef.current || !svgRef.current || posts.length === 0) return;

        const scene = sceneRef.current;
        const cards = scene.querySelectorAll('.post-card-wrapper') as NodeListOf<HTMLElement>;
        const svg = svgRef.current;
        const sphereRadius = 320;

        // SVGクリア
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }

        const positions: { x: number; y: number; z: number }[] = [];

        cards.forEach((card, i) => {
            const phi = Math.acos(-1 + (2 * i) / posts.length);
            const theta = Math.sqrt(posts.length * Math.PI) * phi;

            const x = sphereRadius * Math.cos(theta) * Math.sin(phi);
            const y = sphereRadius * Math.sin(theta) * Math.sin(phi);
            const z = sphereRadius * Math.cos(phi);

            positions.push({ x, y, z });

            const depthFactor = (z + sphereRadius) / (2 * sphereRadius);
            const scale = 0.8 + 0.4 * depthFactor;

            // 基本位置 + スケール
            card.style.transform = `translate3d(${x}px, ${y}px, ${z}px) scale(${scale})`;
            card.style.opacity = `${0.6 + 0.4 * depthFactor}`;

            // ★ 奥行きに応じてz-indexを設定（手前が高い値 → クリック優先）
            const zIndex = Math.round(1000 + z); // zが大きい（手前）ほど高いz-index
            card.style.zIndex = zIndex.toString();

            // クリックを確実に有効化
            card.style.pointerEvents = 'auto';
            card.style.backfaceVisibility = 'visible';
        });

        // SVG線描画
        positions.forEach(({ x, y, z }) => {
            const depthFactor = (z + sphereRadius) / (2 * sphereRadius);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '0');
            line.setAttribute('y1', '0');
            line.setAttribute('x2', x.toString());
            line.setAttribute('y2', y.toString());
            line.setAttribute('stroke', '#94a3b8');
            line.setAttribute('strokeWidth', (0.5 + depthFactor * 1.5).toFixed(2));
            line.setAttribute('strokeOpacity', (0.3 + 0.5 * depthFactor).toFixed(2));
            svg.appendChild(line);
        });

        // 常に正面を向かせる（パフォーマンス最適化版）
        let animationId: number;
        const updateBillboard = () => {
            const style = window.getComputedStyle(scene);
            const matrix = style.transform;

            let currentYRotation = 0;
            if (matrix && matrix !== 'none') {
                const values = matrix.split('(')[1].split(')')[0].split(',');
                const a = parseFloat(values[0]);
                const b = parseFloat(values[1]);
                currentYRotation = Math.round(Math.atan2(b, a) * (180 / Math.PI));
            }

            const counterRotation = `rotateX(-15deg) rotateY(-10deg) rotateY(${currentYRotation * -1}deg)`;

            cards.forEach((card) => {
                const baseTransform = card.style.transform.replace(/ ?rotate[XYZ][^ ]*/g, '').trim();
                card.style.transform = `${baseTransform} ${counterRotation}`;
            });

            animationId = requestAnimationFrame(updateBillboard);
        };

        updateBillboard();

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [isMounted, posts]);

    if (!isMounted) {
        return (
            <div className="relative w-full h-screen flex items-center justify-center">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-gray-900 rounded-full shadow-xl ring-8 ring-gray-300/30" />
            </div>
        );
    }

    return (
        <div className="relative w-full h-screen overflow-hidden flex items-center justify-center">
            {/* 回転する3Dシーン */}
            <div
                ref={sceneRef}
                className="relative w-full h-full [perspective:1200px] [transform-style:preserve-3d] rotate-x-15 rotate-y-10 animate-slow-rotate"
            >
                {/* 中心からの放射線 */}
                <svg
                    ref={svgRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox="-600 -600 1200 1200"
                    preserveAspectRatio="xMidYMid meet"
                />

                {/* 記事カード */}
                {posts.map((post) => (
                    <div
                        key={post.id}
                        className="
                            post-card-wrapper
                            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                            w-48 h-48
                            rounded-full overflow-hidden
                            bg-white/10 backdrop-blur-md
                            shadow-lg border border-white/20
                            origin-center cursor-pointer
                            transition-all duration-500 ease-out
                            hover:z-50 hover:scale-110 hover:opacity-100 hover:shadow-2xl
                            [transform-style:preserve-3d]
                            [backface-visibility:visible]
                            pointer-events-auto
                        ">
                        <PostCard post={post} />
                    </div>
                ))}
            </div>

            {/* 静止した中心点 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-gray-900 rounded-full shadow-xl ring-8 ring-gray-300/30 z-50 pointer-events-none" />
        </div>
    );
}
