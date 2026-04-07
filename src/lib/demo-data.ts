import type { EventType, ContractStatus, PaymentDirection, PaymentStatus, PaymentType } from '@prisma/client'

export type DemoEvent = {
  id: string
  title: string
  date: Date
  eventType: EventType
  locationName: string | null
  clientName: string | null
  musiciansCount: number
}

export type DemoContract = {
  id: string
  eventId: string
  eventTitle: string
  totalAmount: number
  status: ContractStatus
  updatedAt: Date
}

export type DemoPayment = {
  id: string
  amount: number
  direction: PaymentDirection
  status: PaymentStatus
  type: PaymentType
  dueDate: Date | null
  note: string | null
}

export type DemoMusician = {
  id: string
  name: string
  instrument: string | null
  baseCacheCents: number
}

export type DemoRestaurantContract = {
  id: string
  restaurantName: string
  startDate: Date
  endDate: Date
  paymentFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  receivableTotalCents: number
  totalCents: number
  status: 'ACTIVE' | 'ENDED' | 'CANCELLED'
}

export function demoNow() {
  return new Date()
}

export function demoEvents() {
  const base = demoNow()
  const mk = (days: number) => new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
  const list: DemoEvent[] = [
    {
      id: 'demo_event_1',
      title: 'Casamento (Demo)',
      date: mk(10),
      eventType: 'WEDDING',
      locationName: 'Espaço do Evento',
      clientName: 'Noivos (Demo)',
      musiciansCount: 4,
    },
    {
      id: 'demo_event_2',
      title: 'Restaurante (Demo)',
      date: mk(2),
      eventType: 'RESTAURANT',
      locationName: 'Restaurante Central',
      clientName: null,
      musiciansCount: 2,
    },
  ]
  return list
}

export function demoContracts() {
  const base = demoNow()
  const list: DemoContract[] = [
    {
      id: 'demo_contract_1',
      eventId: 'demo_event_1',
      eventTitle: 'Casamento (Demo)',
      totalAmount: 500000,
      status: 'SIGNED',
      updatedAt: base,
    },
  ]
  return list
}

export function demoPayments() {
  const base = demoNow()
  const mk = (days: number) => new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
  const list: DemoPayment[] = [
    {
      id: 'demo_pay_1',
      amount: 500000,
      direction: 'RECEIVABLE',
      status: 'PENDING',
      type: 'CONTRACT_RECEIVABLE',
      dueDate: mk(10),
      note: 'Contrato (Demo)',
    },
    {
      id: 'demo_pay_2',
      amount: 120000,
      direction: 'PAYABLE',
      status: 'PENDING',
      type: 'MUSICIAN_PAYABLE',
      dueDate: mk(2),
      note: 'Cachês (Demo)',
    },
  ]
  return list
}

export function demoMusicians(): DemoMusician[] {
  return [
    { id: 'demo_mus_1', name: 'Músico (Demo)', instrument: 'Voz', baseCacheCents: 80000 },
    { id: 'demo_mus_2', name: 'Violão (Demo)', instrument: 'Violão', baseCacheCents: 70000 },
  ]
}

export function demoRestaurantContracts(): DemoRestaurantContract[] {
  const base = demoNow()
  const mk = (days: number) => new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
  return [
    {
      id: 'demo_rest_1',
      restaurantName: 'Restaurante Central (Demo)',
      startDate: mk(-5),
      endDate: mk(25),
      paymentFrequency: 'MONTHLY',
      receivableTotalCents: 250000,
      totalCents: 180000,
      status: 'ACTIVE',
    },
  ]
}
