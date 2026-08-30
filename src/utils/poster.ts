import { ref, type Ref } from "vue";
import poster_src from "@/assets/img/img.png";

/*
 * 海报抠图:在 Canvas 里一次性烘焙出透明版海报(与原 SVG remove-white 滤镜
 * 完全等价:先按 feColorMatrix 把 alpha 变为 255+A-R-G-B,再按
 * feComposite k1=k2=k3=1 做 alpha 预乘)。运行时不再对 <img> 挂 CSS filter,
 * 避免滤镜层在加载/合成时闪黑;也避免原图先闪现再替换的“闪出来”。
 */

const bakedPoster: Ref<string> = ref("");
const rawPoster: Ref<string> = ref(poster_src);

let objectUrl: string | null = null;
let baked = false;

const bakePoster = async (): Promise<void> => {
    const img = new Image();
    img.src = poster_src;
    await img.decode();

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imageData.data;

    // 原 SVG 滤镜默认在 linearRGB 色彩空间做 feColorMatrix,
    // 必须先把 sRGB 解码到线性光,否则中间调偏亮
    const srgbToLinear = (v: number): number => {
        const s = v / 255;
        return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };

    for (let i = 0; i < d.length; i += 4) {
        const rLin = srgbToLinear(d[i]);
        const gLin = srgbToLinear(d[i + 1]);
        const bLin = srgbToLinear(d[i + 2]);
        const a = d[i + 3] / 255;

        // feColorMatrix: A' = 1 + A - R - G - B(线性空间)
        let alpha = 1 + a - (rLin + gLin + bLin);
        alpha = Math.min(1, Math.max(0, alpha));

        d[i + 3] = alpha * 255;
        // 不修改 RGB,保留原始色值
    }
    ctx.putImageData(imageData, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) return;

    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(blob);
    baked = true;
    bakedPoster.value = objectUrl;
};

if (typeof window !== "undefined") {
    const start = () => {
        if (baked) return;
        bakePoster().catch(() => {});
    };

    if (document.readyState === "complete") {
        if ("requestIdleCallback" in window) {
            window.requestIdleCallback(start, { timeout: 2000 });
        } else {
            setTimeout(start, 0);
        }
    } else {
        window.addEventListener("load", start, { once: true });
    }
}

export { bakedPoster, rawPoster };
export const poster_img = bakedPoster;
