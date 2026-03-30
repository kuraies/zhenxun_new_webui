/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    corePlugins: {
        preflight: false,
    },
    theme: {
        extend: {
            screens: {
                '3xs': '320px',
                '2xs': '375px',
                'xs': '475px',
            },
            minWidth: {
                '0': '0',
            },
        },
    },
    plugins: [],
}