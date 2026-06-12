import { eventBus } from "@/events/eventBus.ts";
import { useBotStore } from "@/store/bot.ts";
import { whiteScreen } from "@/services/ui";
import { getActivePinia } from "pinia";
import { auth } from "@/utils/auth.ts";

export async function handleLoginBotCheck() {
    const botStore = useBotStore(getActivePinia());
    await botStore.getBotList();
    const botList = botStore.botList;
    console.log("Bot list is ", botList);
    await whiteScreen.in();
    if (!botList.length || botList[0].self_id == null) {
        auth.logout();
        setTimeout(async () => {
            await whiteScreen.error();
        }, 500);
    } else {
        eventBus.emit("LOGIN:SUCCESS");
    }
}
