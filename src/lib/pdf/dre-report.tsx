import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { formatCurrencyBRL, formatDateBR } from '@/lib/format'

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 16, marginBottom: 6 },
  subtitle: { fontSize: 10, color: '#444', marginBottom: 12 },
  table: { border: '1 solid #DDD', borderRadius: 6 },
  headerRow: { flexDirection: 'row', backgroundColor: '#F4F4F4', borderBottom: '1 solid #DDD' },
  row: { flexDirection: 'row', borderBottom: '1 solid #EEE' },
  cell: { padding: 6 },
  c1: { width: '16%' },
  c2: { width: '34%' },
  c3: { width: '16%', textAlign: 'right' },
  c4: { width: '16%', textAlign: 'right' },
  c5: { width: '18%', textAlign: 'right' },
})

export function createDreReportPdf({
  title,
  periodLabel,
  rows,
}: {
  title: string
  periodLabel: string
  rows: Array<{
    eventDate: Date
    eventTitle: string
    receivedCents: number
    bandCostCents: number
    profitCents: number
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
            <Text style={[styles.cell, styles.c3]}>Recebido</Text>
            <Text style={[styles.cell, styles.c4]}>Custo</Text>
            <Text style={[styles.cell, styles.c5]}>Resultado</Text>
          </View>

          {rows.map((r, idx) => (
            <View key={`${idx}-${r.eventTitle}`} style={styles.row}>
              <Text style={[styles.cell, styles.c1]}>{formatDateBR(r.eventDate)}</Text>
              <Text style={[styles.cell, styles.c2]}>{r.eventTitle}</Text>
              <Text style={[styles.cell, styles.c3]}>{formatCurrencyBRL(r.receivedCents)}</Text>
              <Text style={[styles.cell, styles.c4]}>{formatCurrencyBRL(r.bandCostCents)}</Text>
              <Text style={[styles.cell, styles.c5]}>{formatCurrencyBRL(r.profitCents)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}

