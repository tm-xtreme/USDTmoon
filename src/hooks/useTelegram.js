
import React from 'react';

const getTelegramData = () => {
  if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    // tg.ready();
    // tg.expand();
    return {
      tg,
      user: tg.initDataUnsafe?.user,
      startParam: tg.initDataUnsafe?.start_param,
    };
  }
  return {
    tg: null,
    user: { id: 123456, first_name: 'Test', last_name: 'User', username: 'testuser', photo_url: "https://i.pravatar.cc/150?u=a042581f4e29026704d" }, // Fallback data for development
    startParam: null,
  };
};

export function useTelegram() {
  const [telegramData, setTelegramData] = React.useState({ tg: null, user: null, startParam: null });

  React.useEffect(() => {
    setTelegramData(getTelegramData());
  }, []);
  
  return telegramData;
}
