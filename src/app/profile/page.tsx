"use client";

import { useEffect, useState } from "react";

import { TelegramProvider, useTelegram } from "@/components/telegram-provider";
import { User } from "@/db/schema/user";

function ProfilePage() {
  const { user: tgUser } = useTelegram();
  const [user, setUser] = useState<User>();
  const [error, setError] = useState();

  useEffect(() => {
    if (tgUser) {
      fetch(`${process.env.URL}/api/user?id=${tgUser.id}`)
        .then((res) => res.json())
        .then((data) => setUser(data))
        .catch((err) => setError(err));
    }
  }, []);

  return (
    <div>
      {user ? (
        <div>
          <h1>Welcome {user?.name}</h1>
          User data:
          <pre>{JSON.stringify(user, null, 2)}</pre>
        </div>
      ) : (
        <div>
          Make sure web app is opened from telegram client {tgUser?.first_name}
          {tgUser?.id}
          <p>{JSON.stringify(user, null, 2)}</p>
          <p>{JSON.stringify(error, null, 2)}</p>
        </div>
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
