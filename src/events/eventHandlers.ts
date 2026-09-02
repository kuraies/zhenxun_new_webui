import { eventBus } from "@/events/eventBus.ts";
import { useBotStore } from "@/store/bot.ts";
import { whiteScreen } from "@/services/ui";
import { getActivePinia } from "pinia";

export async function handleLoginBotCheck() {
    const botStore = useBotStore(getActivePinia());
    await botStore.getBotList();
    const botList = botStore.botList;
    await whiteScreen.in();
    if (!botList.length || botList[0].self_id == null) {
        // 不清除登录态：红屏上的"启用模拟端"接入协议端后
        // 要靠这个 token 轮询 bot 列表并直接进入首页
        setTimeout(async () => {
            await whiteScreen.error();
        }, 500);
    } else {
        eventBus.emit("LOGIN:SUCCESS");
    }
}
