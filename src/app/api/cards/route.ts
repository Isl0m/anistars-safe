import { getCardsFullWithFilter } from "@/lib/queries";

import { Filter } from "@/components/get-filte-options";

export async function POST(request: Request) {
  const body = (await request.json()) as Filter | undefined;
  const cards = await getCardsFullWithFilter(body ?? undefined);
  return new Response(
    JSON.stringify({
      cards,
    })
  );
}
