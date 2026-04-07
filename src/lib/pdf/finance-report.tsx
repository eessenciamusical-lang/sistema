import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { formatCurrencyBRL, formatDateBR } from '@/lib/format'
import { paymentStatusLabel } from '@/lib/labels'

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 16, marginBottom: 6 },
  subtitle: { fontSize: 10, color: '#444', marginBottom: 12 },
  table: { border: '1 solid #DDD', borderRadius: 6 },
  headerRow: { flexDirection: 'row', backgroundColor: '#F4F4F4', borderBottom: '1 solid #DDD' },
  row: { flexDirection: 'row', borderBottom: '1 solid #EEE' },
  cell: { padding: 6 },
  c1: { width: '14%' },
  c2: { width: '30%' },
  c3: { width: '14%' },
  c4: { width: '16%' },
  c5: { width: '14%', textAlign: 'right' },
  c6: { width: '12%' },
})

export function createFinanceReportPdf({
  title,
  periodLabel,
  rows,
}: {
  title: string
  periodLabel: string
  rows: Array<{
    createdAt: Date
    eventTitle: string
    direction: 'RECEIVABLE' | 'PAYABLE'
    status: 'PENDING' | 'RECEIVED' | 'REFUNDED' | 'PAID' | 'CANCELLED'
    amount: number
    note: string | null
  }>
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{periodLabel}</Text>

        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={[styles.cell, styles.c1]}>Data</Text>
            <Text style={[styles.cell, styles.c2]}>Evento</Text>
            <Text style={[styles.cell, styles.c3]}>Direção</Text>
            <Text style={[styles.cell, styles.c4]}>Status</Text>
            <Text style={[styles.cell, styles.c5]}>Valor</Text>
            <Text style={[styles.cell, styles.c6]}>Obs.</Text>
          </View>

          {rows.map((r, idx) => (
            <View key={`${idx}-${r.eventTitle}`} style={styles.row}>
              <Text style={[styles.cell, styles.c1]}>{formatDateBR(r.createdAt)}</Text>
              <Text style={[styles.cell, styles.c2]}>{r.eventTitle}</Text>
              <Text style={[styles.cell, styles.c3]}>{r.direction === 'RECEIVABLE' ? 'Receber' : 'Pagar'}</Text>
              <Text style={[styles.cell, styles.c4]}>{paymentStatusLabel(r.status)}</Text>
              <Text style={[styles.cell, styles.c5]}>{formatCurrencyBRL(r.amount)}</Text>
              <Text style={[styles.cell, styles.c6]}>{r.note ? 'Sim' : '—'}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}

