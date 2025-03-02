"use client";

import { CheckIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CreateTradeType } from "@/app/api/trade/create/route";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { FullCard } from "@/db/schema/card";
import { UserExtended } from "@/db/schema/user";

import CardsFilter from "../cards-filter";
import { FilterOption } from "../get-filte-options";
import { Header } from "../header";
import CardsPagination from "../pagination";
import { useTelegram } from "../telegram-provider";
import { useCardSelect } from "../use-card-select";
import { useCardsFilter } from "../use-cards-filer";

export default function TradePage({ receiver }: { receiver: string }) {
  const { tgUser } = useTelegram();
  const [user, setUser] = useState<UserExtended>();
  const [cards, setCards] = useState<FullCard[]>();
  const [filterOptions, setFilterOptions] = useState<FilterOption[]>();

  useEffect(() => {
    if (tgUser) {
      fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/user/cards/difference?id=${tgUser.id}&secondId=${receiver}`
      )
        .then((res) => res.json())
        .then((data) => {
          setUser(data.user);
          setCards(data.cards);
          setFilterOptions(data.filterOptions);
        });
    }
  }, [tgUser]);
  if (!user || !filterOptions || !cards) {
    return (
      <main className="flex min-h-screen flex-col gap-8 px-4 py-12 md:container">
        <h1 className="text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
          Загрузка...
        </h1>
      </main>
    );
  }
  return (
    <main className="flex min-h-screen flex-col gap-4 md:container">
      <TradePageContent
        user={user}
        cards={cards}
        receiver={receiver}
        filterOptions={filterOptions}
      />
    </main>
  );
}

type Steps = "select" | "confirm";

function TradePageContent({
  user,
  cards,
  filterOptions,
  receiver,
}: {
  user: UserExtended;
  cards: FullCard[];
  filterOptions: FilterOption[];
  receiver: string;
}) {
  const { pageCards, pagination, filterReset, filterSelect } = useCardsFilter({
    cards,
    cardsPerPage: 16,
  });

  const { selectedCards, resetSelected, onCardSelect } = useCardSelect();
  const router = useRouter();
  const [step, setStep] = useState<Steps>("select");
  const [isLoading, setIsLoading] = useState(false);
  const maxCardsPerTrade = user.isPremium ? 10 : 5;

  const handleTrade = async () => {
    setIsLoading(true);
    if (selectedCards.length === 0) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, выберите хотя бы одну карту для обмена.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    if (selectedCards.length > maxCardsPerTrade) {
      toast({
        title: "Ошибка",
        description: `Максимальное количество выбираемых карт - ${maxCardsPerTrade}.`,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const data: CreateTradeType = {
      senderId: user.id,
      receiverId: receiver,
      cardIds: selectedCards.map((c) => c.id),
    };

    await fetch(`${process.env.NEXT_PUBLIC_URL}/api/trade/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    toast({
      title: "Трейд отправлен",
      description: `Трейд ${selectedCards.length} карт отправлен ${receiver}`,
    });

    // Reset the form
    router.push(`/trade`);
    setIsLoading(false);
  };

  const headerSection: Record<Steps, JSX.Element> = {
    select: (
      <Header
        title="Трейд"
        element={
          <CardsFilter
            filterOptions={filterOptions}
            onFilterSelect={filterSelect}
            onFiltersReset={filterReset}
          />
        }
      />
    ),
    confirm: <Header title="Подтверждение" />,
  };

  const mainSection: Record<Steps, JSX.Element> = {
    select: (
      <CardsSelectList
        pageCards={pageCards}
        selectedCards={selectedCards}
        onClick={onCardSelect}
        pagination={pagination}
      />
    ),
    confirm: (
      <SelectedCardsList selectedCards={selectedCards} onClick={onCardSelect} />
    ),
  };

  const footerSection: Record<Steps, JSX.Element> = {
    select: (
      <div className="fixed bottom-0 left-0 flex w-full gap-4 border-t bg-background p-2">
        <Button
          onClick={resetSelected}
          className="w-full"
          size={"sm"}
          variant={"destructive"}
        >
          Сбросить
        </Button>
        <Button
          onClick={() => setStep("confirm")}
          className="w-full"
          size={"sm"}
          disabled={selectedCards.length === 0}
        >
          Продолжить ({selectedCards.length})
        </Button>
      </div>
    ),
    confirm: (
      <div className="fixed bottom-0 left-0 w-full border-t bg-background p-2">
        <div className="flex gap-4">
          <Button
            onClick={() => setStep("select")}
            size={"sm"}
            className="w-full"
            variant={"secondary"}
          >
            Назад
          </Button>
          <Button
            onClick={handleTrade}
            size={"sm"}
            disabled={isLoading}
            className="w-full"
          >
            Подтвердить
          </Button>
        </div>
      </div>
    ),
  };

  return (
    <>
      {headerSection[step]}

      <div className="px-2">{mainSection[step]}</div>

      {footerSection[step]}
    </>
  );
}

type CardsSelectListProps = {
  pageCards: FullCard[];
  selectedCards: FullCard[];
  onClick: (card: FullCard) => () => void;
  pagination: {
    page: number;
    cardsLeft: number;
    changePage: (page: number) => void;
  };
};

export function CardsSelectList({
  pageCards,
  selectedCards,
  onClick,
  pagination: { page, cardsLeft, changePage },
}: CardsSelectListProps) {
  return (
    <section className="flex flex-col gap-12">
      {pageCards.length > 0 ? (
        <div className="mb-12 space-y-4">
          <ul className="grid grid-cols-4 gap-2">
            {pageCards.map((card) => (
              <li
                key={card.id}
                className={`relative w-fit cursor-pointer overflow-hidden transition-all duration-100 ease-in-out ${
                  Boolean(selectedCards.find((s) => s.id === card.id))
                    ? "rounded-md ring-2 ring-primary"
                    : "hover:ring-1 hover:ring-primary-foreground"
                }`}
                onClick={onClick(card)}
              >
                <div>
                  <Image
                    src={card.image}
                    width={255}
                    height={320}
                    className="rounded"
                    alt={card.slug}
                  />
                  {Boolean(selectedCards.find((s) => s.id === card.id)) && (
                    <div className="absolute right-1 top-1 rounded-full bg-primary p-1 transition-opacity duration-100 ease-in-out">
                      <CheckIcon className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <CardsPagination
            page={page}
            cardsLeft={cardsLeft}
            handleChangePage={changePage}
          />
        </div>
      ) : (
        <h1>Нет подходящих карт</h1>
      )}
    </section>
  );
}

type SelectedCardsListProps = {
  selectedCards: FullCard[];
  onClick: (card: FullCard) => () => void;
};

export function SelectedCardsList({
  selectedCards,
  onClick,
}: SelectedCardsListProps) {
  return (
    <ul className="grid grid-cols-5 gap-2">
      {selectedCards.map((card) => (
        <li
          key={card.id}
          className={`relative w-fit cursor-pointer overflow-hidden rounded ring-1 ring-primary transition-all duration-100 ease-in-out`}
          onClick={onClick(card)}
        >
          <div>
            <Image src={card.image} width={255} height={320} alt={card.slug} />

            <div className="absolute right-1 top-1 rounded-full bg-primary p-[2px] transition-opacity duration-100 ease-in-out">
              <CheckIcon className="h-2 w-2 text-primary-foreground" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
