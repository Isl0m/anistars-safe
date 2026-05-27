export const listingStatusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  active: { label: "Активно", variant: "default" },
  completed: { label: "Завершено", variant: "secondary" },
  cancelled: { label: "Отменено", variant: "destructive" },
};

export const offerStatusMap: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "Ожидание",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  },
  accepted: {
    label: "Принято",
    className: "border-green-500/30 bg-green-500/10 text-green-600",
  },
  cancelled: {
    label: "Отклонено",
    className: "border-red-500/30 bg-red-500/10 text-red-600",
  },
};
