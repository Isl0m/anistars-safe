import { cn } from "@/lib/utils";

function getGradient(name: string) {
  const gradients = [
    "from-orange-500 to-yellow-500",
    "from-red-600 to-orange-600",
    "from-emerald-500 to-teal-600",
    "from-blue-500 to-cyan-400",
    "from-purple-600 to-pink-500",
    "from-indigo-500 to-violet-600",
    "from-amber-500 to-orange-600",
    "from-fuchsia-600 to-purple-600",
    "from-pink-500 to-rose-500",
    "from-violet-600 to-indigo-600",
    "from-cyan-500 to-blue-600",
    "from-rose-500 to-red-600",
    "from-teal-400 to-emerald-500",
    "from-lime-500 to-green-600",
    "from-sky-400 to-blue-500",
    "from-yellow-400 to-orange-500",
    "from-indigo-400 to-cyan-400",
    "from-fuchsia-500 to-pink-500",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

interface CollectionProgressProps {
  name: string;
  userCards: number;
  totalCards: number;
  percentage: number;
  isMinimal?: boolean;
  className?: string;
  color?: string;
}

export function CollectionProgress({
  name,
  userCards,
  totalCards,
  percentage,
  isMinimal,
  className,
  color,
}: CollectionProgressProps) {
  color = color || getGradient(name);
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden p-1",
        !isMinimal && "rounded-2xl border border-white/10 p-5",
        className
      )}
    >
      <div
        className={cn(
          `absolute inset-0`,
          !isMinimal && `bg-gradient-to-br ${color} opacity-10`
        )}
      />

      {!isMinimal && (
        <div
          className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${color} opacity-20 blur-2xl`}
        />
      )}

      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            {name}
          </h3>
          <span
            className={`rounded-full bg-gradient-to-r px-3 py-1 text-sm font-bold ${color} text-white shadow-lg`}
          >
            {percentage}%
          </span>
        </div>

        <div className="mb-3 flex items-end justify-between">
          <div className="text-xs font-medium text-muted-foreground">Карты</div>
          <div className="text-base font-bold">
            <span className="text-foreground">{userCards}</span>
            <span className="text-muted-foreground/60"> / {totalCards}</span>
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5 backdrop-blur-sm">
          <div
            className={`h-full bg-gradient-to-r ${color} shadow-lg transition-all duration-500 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
