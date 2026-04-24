import { eventBus } from "@/events/eventBus.ts";
import { handleLoginBotCheck } from "@/events/eventHandlers.ts";

export function registerEvent() {
    eventBus.on("LOGIN:BOT", handleLoginBotCheck);
}