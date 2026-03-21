import type { Metadata } from "next";
import { getCarById } from "@/lib/all-cars";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const fromLocal = getCarById(id);
  if (fromLocal) {
    const title = `${fromLocal.brand} ${fromLocal.model}`;
    const description =
      fromLocal.description ??
      `Rent ${fromLocal.brand} ${fromLocal.model} in the Faroe Islands. Pickup from ${fromLocal.pickupLocation ?? fromLocal.location}.`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${baseUrl}/rent-a-car/${id}`,
      },
    };
  }

  // Use short titles for template; root layout appends " | RentLocal"
  try {
    const res = await fetch(
      `${baseUrl}/api/listings/${id}/public`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return { title: "Car" };
    const json = await res.json();
    const car = json?.data;
    const brand = car?.brand ?? car?.make;
    const model = car?.model;
    if (!brand || !model) return { title: "Car" };
    const title = `${brand} ${model}`;
    const description =
      car.description ??
      `Rent ${brand} ${model} in the Faroe Islands on RentLocal.`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${baseUrl}/rent-a-car/${id}`,
      },
    };
  } catch {
    return { title: "Car" };
  }
}

export default function CarDetailLayout({ children }: Props) {
  return <>{children}</>;
}
