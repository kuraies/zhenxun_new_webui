<template>
    <div ref="container" class="fixed inset-0 pointer-events-none z-[9999]"></div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { gsap } from 'gsap'
import type { ZXConfettiOptions, ZXConfettiExposed } from './types'

const container = ref<HTMLDivElement | null>(null)

/**
 * 🎉 发射 Confetti
 */
function launch(
    x: number,
    y: number,
    {
        total = 40,
        useEmoji = false,
        emojiList = ['🎉', '✨', '💥', '🎊'],
        colors = ['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f472b6'],
    }: ZXConfettiOptions = {}
): void {
    if (!container.value) return

    for (let i = 0; i < total; i++) {
        const div = document.createElement('div')
        const size = gsap.utils.random(8, 14)

        if (useEmoji) {
            div.textContent = gsap.utils.random(emojiList)
            Object.assign(div.style, {
                fontSize: `${size + 4}px`,
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                pointerEvents: 'none',
                userSelect: 'none',
            })
        } else {
            Object.assign(div.style, {
                width: `${size}px`,
                height: `${size * 0.4}px`,
                backgroundColor: gsap.utils.random(colors),
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                borderRadius: '1px',
                transform: `rotate(${gsap.utils.random(0, 360)}deg)`,
                pointerEvents: 'none',
            })
        }

        container.value.appendChild(div)

        const angle = gsap.utils.random(0, Math.PI * 2)
        const velocity = gsap.utils.random(180, 360)
        const vx = Math.cos(angle) * velocity
        const vy = Math.sin(angle) * velocity

        gsap.to(div, {
            duration: gsap.utils.random(1.2, 2),
            x: `+=${vx}`,
            y: `+=${vy}`,
            rotation: gsap.utils.random(180, 720),
            ease: 'power3.out',
        })

        gsap.to(div, {
            delay: 0.3,
            duration: 1.5,
            opacity: 0,
            y: `+=${gsap.utils.random(100, 200)}`,
            ease: 'power1.in',
            onComplete: () => div.remove(),
        })
    }
}

// ✅ 向外暴露时，强制类型为 ZXConfettiExposed
defineExpose<ZXConfettiExposed>({
    launch,
})
</script>
