import type { ContractStatus, PaymentStatus } from '@prisma/client'

export function contractStatusLabel(status: ContractStatus) {
  switch (status) {
    case 'DRAFT':
      return 'Rascunho'
    case 'SENT':
      return 'Enviado'
    case 'SIGNED':
      return 'Assinado'
    case 'CANCELLED':
      return 'Cancelado'
    default:
      return status
  }
}

export function paymentStatusLabel(status: PaymentStatus) {
  switch (status) {
    case 'PENDING':
      return 'Pendente'
    case 'RECEIVED':
      return 'Recebido'
    case 'REFUNDED':
      return 'Estornado'
    case 'PAID':
      return 'Pago'
    case 'CANCELLED':
      return 'Cancelado'
    default:
      return status
  }
}

