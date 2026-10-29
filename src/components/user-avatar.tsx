import type { CSSProperties } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

type Props = {
  name: string;
  photoUrl?: string | null;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export function UserAvatar({
  name,
  photoUrl,
  size = 32,
  className,
  style,
}: Props) {
  // By code point: charAt(0) splits an emoji-first name into half a
  // surrogate pair, which the server and client render differently.
  const initial = (Array.from(name)[0] ?? "").toUpperCase();

  return (
    <div
      className={cn(
        "relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full font-bold",
        photoUrl
          ? "bg-primary/10 text-primary"
          : "bg-secondary text-secondary-foreground",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.375, ...style }}
    >
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={name}
          fill
          sizes="300px"
          className="object-cover"
          unoptimized
        />
      ) : (
        initial
      )}
    </div>
  );
}
