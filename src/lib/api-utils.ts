import { NextResponse } from "next/server";

export function getRequiredParam(request: Request, param: string) {
  const { searchParams } = new URL(request.url);
  const value = searchParams.get(param);
  if (!value) {
    return {
      error: NextResponse.json(
        { error: `${param} param required` },
        { status: 400 }
      ),
    };
  }
  return { value };
}
