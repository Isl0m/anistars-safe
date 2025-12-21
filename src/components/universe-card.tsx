function getGradient(name: string) {
  const gradients = [
    "from-orange-500 to-yellow-500", // Naruto style
    "from-red-600 to-orange-600", // One Piece style
    "from-emerald-500 to-teal-600", // AoT style
    "from-blue-500 to-cyan-400", // MHA style
    "from-purple-600 to-pink-500", // Demon Slayer style
    "from-indigo-500 to-violet-600", // JJK style
    "from-amber-500 to-orange-600", // Dragon Ball style
    "from-fuchsia-600 to-purple-600", // Vibrant Purple
    "from-pink-500 to-rose-500", // Bright Pink
    "from-violet-600 to-indigo-600", // Deep Violet
    "from-cyan-500 to-blue-600", // Electric Blue
    "from-rose-500 to-red-600", // Intense Red
    "from-teal-400 to-emerald-500", // Minty Green
    "from-lime-500 to-green-600", // Lime Green
    "from-sky-400 to-blue-500", // Sky Blue
    "from-yellow-400 to-orange-500", // Sunny Yellow
    "from-indigo-400 to-cyan-400", // Cool Gradient
    "from-fuchsia-500 to-pink-500", // Hot Pink
  ];

  // Simple hash function to get a consistent index from the string
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

interface UniverseCardProps {
  id: number;
  name: string;
  userCards: number;
  totalCards: number;
}

export function UniverseCard({
  id,
  name,
  userCards,
  totalCards,
}: UniverseCardProps) {
  const percentage = Math.round((userCards / totalCards) * 100);
  const color = getGradient(name);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 p-5">
      {/* Permanent Gradient Background */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${color} opacity-10`}
      />

      {/* Accent gradient glow */}
      <div
        className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${color} opacity-20 blur-2xl`}
      />

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

        {/* Modern Progress Bar with gradient fill */}
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
