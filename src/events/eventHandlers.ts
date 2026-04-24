import { eventBus } from "@/events/eventBus.ts";
import { useBotStore } from "@/store/bot.ts";
import { whiteScreen } from "@/components";
import { createPinia } from "pinia";
import { auth } from "@/utils/auth.ts";

const pinia = createPinia();

export async function handleLoginBotCheck() {
    const botStore = useBotStore(pinia);
    await botStore.getBotList();
    const botList = botStore.botList;
    console.log("Bot list is ", botList);
    await whiteScreen.in();
    if (botList[0].self_id == null) {
        auth.logout();
        setTimeout(async () => {
            await whiteScreen.error();
        }, 500);
    }
    eventBus.emit("LOGIN:SUCCESS");
}
