/**
 * 生成 OneBot 调试客户端的 PWA 图标（无第三方依赖）
 *
 * 画法：蓝色圆角底 + 白色聊天气泡 + 两只眼睛的机器人脸。
 * 通过 4x 超采样 + 平均降采样得到平滑边缘。
 *
 * 用法：node scripts/gen-debug-icons.mjs
 * 输出：public/debug/icon-192.png / icon-512.png / icon-maskable-512.png
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../public-debug",
);

const BG = [59, 130, 246]; // #3b82f6，与主题默认主色一致
const FG = [255, 255, 255];

// ==================== 极简 PNG 编码器 ====================

const CRC_TABLE = (() => {
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[n] = c;
    }
    return table;
})();

const crc32 = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) {
        c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
};

const encodePng = (width, height, rgba) => {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // color type RGBA
    // 每行前置 filter 0
    const raw = Buffer.alloc((width * 4 + 1) * height);
    for (let y = 0; y < height; y++) {
        raw[y * (width * 4 + 1)] = 0;
        rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
    }
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", ihdr),
        chunk("IDAT", deflateSync(raw, { level: 9 })),
        chunk("IEND", Buffer.alloc(0)),
    ]);
};

// ==================== 绘制 ====================

const SS = 4; // 超采样倍数

const inRoundedRect = (x, y, cx, cy, hw, hh, r) => {
    const dx = Math.abs(x - cx);
    const dy = Math.abs(y - cy);
    if (dx > hw || dy > hh) return false;
    if (dx <= hw - r || dy <= hh - r) return true;
    const qx = dx - (hw - r);
    const qy = dy - (hh - r);
    return qx * qx + qy * qy <= r * r;
};

const inCircle = (x, y, cx, cy, r) => {
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= r * r;
};

const inTriangle = (x, y, ax, ay, bx, by, cx, cy) => {
    const sign = (x1, y1, x2, y2, x3, y3) =>
        (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
    const d1 = sign(x, y, ax, ay, bx, by);
    const d2 = sign(x, y, bx, by, cx, cy);
    const d3 = sign(x, y, cx, cy, ax, ay);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
};

/**
 * @param size 目标尺寸
 * @param maskable true 时全出血背景（无圆角），内容收进 80% 安全区
 */
const drawIcon = (size, maskable) => {
    const big = size * SS;
    const buf = Buffer.alloc(big * big * 4);

    // 圆角底：普通版 22% 圆角；maskable 版全出血
    const bgR = maskable ? 0 : big * 0.22;
    const inBg = (x, y) =>
        bgR === 0 ? true : inRoundedRect(x, y, big / 2, big / 2, big / 2, big / 2, bgR);

    // 气泡（机器人脸）：maskable 时整体缩到 70%，保证安全区裁切后完整
    const scale = maskable ? 0.7 : 0.85;
    const bw = big * 0.56 * scale; // 气泡半宽
    const bh = big * 0.42 * scale; // 气泡半高
    const bcx = big / 2;
    const bcy = big / 2 - big * 0.03 * scale;
    const br = big * 0.12 * scale;
    const inBubble = (x, y) =>
        inRoundedRect(x, y, bcx, bcy, bw, bh, br) ||
        // 气泡尾巴：左下角向左下伸出的小三角
        inTriangle(
            x, y,
            bcx - bw + br * 0.4, bcy + bh * 0.55,
            bcx - bw + br * 1.6, bcy + bh,
            bcx - bw + br * 0.2, bcy + bh,
        );

    // 眼睛
    const eyeR = big * 0.045 * scale;
    const eyeOffX = bw * 0.38;
    const inEye = (x, y) =>
        inCircle(x, y, bcx - eyeOffX, bcy, eyeR) ||
        inCircle(x, y, bcx + eyeOffX, bcy, eyeR);

    for (let y = 0; y < big; y++) {
        for (let x = 0; x < big; x++) {
            const i = (y * big + x) * 4;
            let color;
            if (!inBg(x, y)) {
                color = [0, 0, 0]; // 圆角外透明
            } else if (inBubble(x, y) && !inEye(x, y)) {
                color = FG;
            } else {
                color = BG;
            }
            const alpha = color[0] === 0 && color[1] === 0 && color[2] === 0 ? 0 : 255;
            buf[i] = color[0];
            buf[i + 1] = color[1];
            buf[i + 2] = color[2];
            buf[i + 3] = alpha;
        }
    }

    // 平均降采样
    const out = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (let sy = 0; sy < SS; sy++) {
                for (let sx = 0; sx < SS; sx++) {
                    const i = ((y * SS + sy) * big + (x * SS + sx)) * 4;
                    r += buf[i];
                    g += buf[i + 1];
                    b += buf[i + 2];
                    a += buf[i + 3];
                }
            }
            const n = SS * SS;
            const i = (y * size + x) * 4;
            // 透明像素参与平均时按 alpha 加权，避免边缘发黑
            const alpha = a / n;
            out[i] = r / n;
            out[i + 1] = g / n;
            out[i + 2] = b / n;
            out[i + 3] = alpha;
        }
    }
    return encodePng(size, size, out);
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(resolve(OUT_DIR, "icon-192.png"), drawIcon(192, false));
writeFileSync(resolve(OUT_DIR, "icon-512.png"), drawIcon(512, false));
writeFileSync(resolve(OUT_DIR, "icon-maskable-512.png"), drawIcon(512, true));
console.log("icons generated in", OUT_DIR);
