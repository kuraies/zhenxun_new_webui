export async function navigateTo(path) {
    try {
        // 使用更可靠的导入方式
        const router = await import('@/router/index.js');

        // 检查 router 对象及其 push 方法是否存在
        if (router?.push) {
            await router.push(path);
        } else {
            // 更优雅的备选方案
            window.location.hash = `#${path}`;
        }
    } catch (error) {
        console.error('路由导航失败:', error);
        // 提供更友好的备选方案
        window.location.hash = `#${path}`;
    }
}