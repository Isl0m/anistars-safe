import { useState } from "react";

import { FullCard } from "@/db/schema/card";

export function useCardSelect() {
  const [selectedCards, setSelectedCards] = useState<FullCard[]>([]);

  const handleCardSelect = (card: FullCard) => {
    setSelectedCards((prev) =>
      prev.find((p) => p.id === card.id)
        ? prev.filter((p) => p.id !== card.id)
        : [...prev, card]
    );
  };

  const resetSelected = () => {
    setSelectedCards([]);
  };

  const onCardSelect = (card: FullCard) => () => handleCardSelect(card);
  return { selectedCards, resetSelected, onCardSelect };
}
