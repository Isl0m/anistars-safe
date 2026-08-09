import Link from "next/link";

import { cn } from "@/lib/utils";

import { UserAvatar } from "./user-avatar";

type Props = {
  userId: string;
  name: string;
  photoUrl?: string | null;
  size?: number;
  className?: string;
  avatarClassName?: string;
  children?: React.ReactNode;
};

export function UserLink({
  userId,
  name,
  photoUrl,
  size = 32,
  className,
  avatarClassName,
  children,
}: Props) {
  return (
    <Link
      href={`/profile/${userId}`}
      className={cn("flex items-center gap-2", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <UserAvatar
        name={name}
        photoUrl={photoUrl}
        size={size}
        className={avatarClassName}
      />
      {children}
    </Link>
  );
}
