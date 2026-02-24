import { useEffect, useState } from "react";
import { initDatabase } from "@/db/database";
import { repositories } from "@/db/repositories";
import { useAppStore } from "@/store/app-store";

export function useAppBootstrap() {
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      await initDatabase();
      let user = await repositories.user.getCurrentUser();
      if (!user) {
        user = await repositories.user.createDefaultUser("Smart Shopper");
      }
      setCurrentUser(user);
      if (mounted) setIsReady(true);
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [setCurrentUser]);

  return { isReady };
}
