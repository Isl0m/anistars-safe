"use client";

import { useEffect, useState } from "react";

import { WebApp } from "@/lib/types";

import { User } from "@/db/schema/user";

export default function Profile() {
  const [user, setUser] = useState<User>();
  const [userId, setUserId] = useState<string>();

  useEffect(() => {
    const app: WebApp = (window as any).Telegram?.WebApp;
    const userId = app?.initDataUnsafe.user.id;
    setUserId(String(userId));
    if (app && userId) {
      fetch(`${process.env.URL}/api/user?id=${userId}`)
        .then((res) => res.json())
        .then((data) => setUser(data));
    }
  }, []);

  if (!user)
    return (
      <div>
        <h1>Profile {userId}</h1>
        <p>Loading...</p>
      </div>
    );

  return (
    <div>
      <h1>Profile: ${user.name}</h1>
      <p>ID: {user.id}</p>
    </div>
  );
}
