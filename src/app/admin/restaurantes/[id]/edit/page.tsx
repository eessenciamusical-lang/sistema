import { redirect } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'

export default async function RestauranteContratoEditPage({ params }: Props) {
  const { id } = await params
  redirect(`/admin/restaurantes/${id}`)
}

