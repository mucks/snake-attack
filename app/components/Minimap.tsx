import { useEffect, useRef } from 'react';
import type { MinimapData } from '../game/types';
import { MINIMAP_SIZE, MINIMAP_PADDING, MINIMAP_SCALE, WORLD_SIZE } from '../game/constants';

type MinimapProps = {
    data: MinimapData;
};

export default function Minimap({ data }: MinimapProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const drawMinimap = () => {
            // Clear
            ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

            // Background
            ctx.fillStyle = 'rgba(10, 42, 42, 0.8)';
            ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

            // Border
            ctx.strokeStyle = 'rgba(13, 77, 77, 0.9)';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

            // World bounds
            const worldStartX = MINIMAP_SIZE / 2 - (WORLD_SIZE * MINIMAP_SCALE);
            const worldStartY = MINIMAP_SIZE / 2 - (WORLD_SIZE * MINIMAP_SCALE);
            const worldWidth = WORLD_SIZE * 2 * MINIMAP_SCALE;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(worldStartX, worldStartY, worldWidth, worldWidth);

            // Helper to convert world to minimap coords
            const worldToMinimap = (x: number, z: number) => ({
                x: MINIMAP_SIZE / 2 + x * MINIMAP_SCALE,
                y: MINIMAP_SIZE / 2 + z * MINIMAP_SCALE,
            });

            // Draw mazes - bigger squares for bigger mazes
            data.mazes.forEach(maze => {
                const pos = worldToMinimap(maze.x, maze.z);
                const mazeSize = 50 * MINIMAP_SCALE; // Match server maze size (50 units)
                ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
                ctx.fillRect(pos.x - mazeSize / 2, pos.y - mazeSize / 2, mazeSize, mazeSize);
                ctx.strokeStyle = 'rgba(150, 150, 150, 0.6)';
                ctx.lineWidth = 1;
                ctx.strokeRect(pos.x - mazeSize / 2, pos.y - mazeSize / 2, mazeSize, mazeSize);
            });

            // Draw MEGA treasures with pulsing glow
            data.treasures.forEach(treasure => {
                const pos = worldToMinimap(treasure.x, treasure.z);
                const pulse = Math.sin(Date.now() * 0.003) * 0.5 + 0.5;

                // Outer glow
                ctx.fillStyle = `rgba(255, 215, 0, ${0.3 + pulse * 0.3})`;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 6 + pulse * 2, 0, Math.PI * 2);
                ctx.fill();

                // Inner star
                ctx.fillStyle = `rgba(255, 215, 0, ${0.9 + pulse * 0.1})`;
                ctx.shadowColor = 'rgba(255, 215, 0, 1)';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            });

            // Draw multiplayer players
            data.multiplayerPlayers.forEach(player => {
                const pos = worldToMinimap(player.x, player.z);
                ctx.fillStyle = 'rgba(255, 0, 255, 0.8)';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw player (you) with direction indicator
            const playerPos = worldToMinimap(data.playerPos.x, data.playerPos.z);
            ctx.fillStyle = 'rgba(0, 255, 255, 1.0)';
            ctx.beginPath();
            ctx.arc(playerPos.x, playerPos.y, 3, 0, Math.PI * 2);
            ctx.fill();

            // Draw direction arrow
            const dirLength = 8;
            const dirEndX = playerPos.x + data.playerDirection.x * dirLength;
            const dirEndY = playerPos.y + data.playerDirection.z * dirLength;

            ctx.strokeStyle = 'rgba(0, 255, 255, 1.0)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(playerPos.x, playerPos.y);
            ctx.lineTo(dirEndX, dirEndY);
            ctx.stroke();

            // Arrow head
            const arrowSize = 3;
            const angle = Math.atan2(data.playerDirection.z, data.playerDirection.x);
            ctx.fillStyle = 'rgba(0, 255, 255, 1.0)';
            ctx.beginPath();
            ctx.moveTo(dirEndX, dirEndY);
            ctx.lineTo(
                dirEndX - arrowSize * Math.cos(angle - Math.PI / 6),
                dirEndY - arrowSize * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
                dirEndX - arrowSize * Math.cos(angle + Math.PI / 6),
                dirEndY - arrowSize * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
        };

        const animationId = requestAnimationFrame(function loop() {
            drawMinimap();
            requestAnimationFrame(loop);
        });

        return () => cancelAnimationFrame(animationId);
    }, [data]);

    return (
        <canvas
            ref={canvasRef}
            width={MINIMAP_SIZE}
            height={MINIMAP_SIZE}
            style={{
                position: 'absolute',
                bottom: MINIMAP_PADDING,
                right: MINIMAP_PADDING,
                border: '2px solid rgba(0, 255, 255, 0.5)',
                borderRadius: '8px',
                boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)',
            }}
        />
    );
}

