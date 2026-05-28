import Image from "next/image";

import { cn } from "@/lib/utils";

type Props = {
  name: string;
  photoUrl?: string | null;
  size?: number;
  className?: string;
};

export function UserAvatar({ name, photoUrl, size = 32, className }: Props) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-bold text-primary",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.375 }}
    >
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={name}
          fill
          className="object-cover"
          unoptimized
        />
      ) : (
        initial
      )}
    </div>
  );
}
