export async function mutate(body: Record<string, unknown>) {
  if (body.demo)
    throw new Error(
      "Esta é uma publicação de demonstração. Entre com sua conta para interagir com publicações reais.",
    );
  const response = await fetch("/api/social", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error ?? "Não foi possível concluir. Tente novamente.",
    );
  return result;
}
