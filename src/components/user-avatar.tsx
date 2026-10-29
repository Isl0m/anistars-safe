"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

type Props = {
  name: string;
  photoUrl?: string | null;
  size?: number;
  className?: string;
  fallbackClassName?: string;
};

export function UserAvatar({
  name,
  photoUrl,
  size = 32,
  className,
  fallbackClassName,
}: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = !!photoUrl && photoUrl !== failedUrl;
  // By code point: charAt(0) splits an emoji-first name into half a
  // surrogate pair, which the server and client render differently.
  const initial = (Array.from(name)[0] ?? "").toUpperCase();

  return (
    <div
      className={cn(
        "relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full font-bold",
        showPhoto
          ? "bg-primary/10 text-primary"
          : cn("bg-secondary text-secondary-foreground", fallbackClassName),
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.375 }}
    >
      {showPhoto ? (
        <Image
          src={photoUrl}
          alt={name}
          fill
          sizes="300px"
          className="object-cover"
          unoptimized
          onError={() => setFailedUrl(photoUrl)}
        />
      ) : (
        initial
      )}
    </div>
  );
}
