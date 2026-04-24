import { ObjectDirective } from "vue";
import { gsap } from "gsap";

type CountupBinding =
    | number
    | {
          value: number;
          duration?: number;
          decimals?: number;
          formatter?: (v: number) => string;
      };

interface CountupHTMLElement extends HTMLElement {
    _countup?: {
        current: number;
    };
}

const defaultOptions = {
    duration: 1,
    decimals: 0,
};

export const vOdometer: ObjectDirective<CountupHTMLElement, CountupBinding> = {
    mounted(el, binding) {
        const { value, duration, decimals, formatter } = normalize(
            binding.value,
            el,
        );

        el._countup = {
            current: 0,
        };

        animate(el, 0, value, {
            duration,
            decimals,
            formatter,
        });

        el._countup.current = value;
    },

    updated(el, binding) {
        if (!el._countup) return;

        const { value, duration, decimals, formatter } = normalize(
            binding.value,
            el,
        );

        const from = el._countup.current;
        if (from === value) return;

        animate(el, from, value, {
            duration,
            decimals,
            formatter,
        });

        el._countup.current = value;
    },

    unmounted(el) {
        gsap.killTweensOf(el);
    },
};

function normalize(bindingValue: CountupBinding, el: HTMLElement) {
    if (typeof bindingValue === "number") {
        return { value: bindingValue, ...defaultOptions };
    }

    if (typeof bindingValue === "object" && bindingValue !== null) {
        return {
            value: bindingValue.value ?? 0,
            duration: bindingValue.duration ?? defaultOptions.duration,
            decimals: bindingValue.decimals ?? defaultOptions.decimals,
            formatter: bindingValue.formatter,
        };
    }

    const text = el.textContent?.trim() || "0";
    const num = Number(text.replace(/,/g, ""));

    return {
        value: isNaN(num) ? 0 : num,
        ...defaultOptions,
    };
}

function animate(
    el: HTMLElement,
    from: number,
    to: number,
    options: {
        duration: number;
        decimals: number;
        formatter?: (v: number) => string;
    },
) {
    const obj = { value: from };

    gsap.to(obj, {
        value: to,
        duration: options.duration,
        ease: "power2.out",
        onUpdate: () => {
            const val = obj.value;

            if (options.formatter) {
                el.textContent = options.formatter(val);
            } else {
                el.textContent = formatNumber(val, options.decimals);
            }
        },
    });
}

function formatNumber(val: number, decimals: number) {
    const fixed = val.toFixed(decimals);

    // 千分位
    return Number(fixed).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}