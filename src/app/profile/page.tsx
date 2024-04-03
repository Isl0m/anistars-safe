"use client";

import { TelegramProvider, useTelegram } from "@/components/telegram-provider";

function ProfilePage() {
  const { user, webApp } = useTelegram();
  console.log(user);

  return (
    <div>
      {user ? (
        <div>
          <h1>Welcome {user?.username}</h1>
          User data:
          <pre>{JSON.stringify(user, null, 2)}</pre>
          Eniter Web App data:
          <pre>{JSON.stringify(webApp, null, 2)}</pre>
        </div>
      ) : (
        <div>Make sure web app is opened from telegram client</div>
      )}
    </div>
  );
}

const ProfilePageWithProvider = () => {
  return (
    <TelegramProvider>
      <ProfilePage />
    </TelegramProvider>
  );
};

export default ProfilePageWithProvider;
