import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { formatCurrencyBRL, formatDateBR } from '@/lib/format'

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 11, fontFamily: 'Helvetica' },
  title: { fontSize: 18, marginBottom: 10 },
  subtitle: { fontSize: 12, marginBottom: 14, color: '#333' },
  section: { marginTop: 12, paddingTop: 12, borderTop: '1 solid #DDD' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { color: '#555' },
  value: { color: '#111' },
  box: { padding: 10, backgroundColor: '#F7F7F7', borderRadius: 6 },
  small: { fontSize: 10, color: '#444' },
  mono: { fontFamily: 'Courier' },
})

export function createContractPdf({
  agencyName,
  contract,
}: {
  agencyName: string
  contract: {
    id: string
    status: string
    totalAmount: number
    terms: string | null
    event: {
      title: string
      date: Date
      locationName: string | null
      address: string | null
      city: string | null
      state: string | null
      client: { name: string; email: string | null; phone: string | null } | null
      assignments: { musician: { user: { name: string } }; roleName: string | null }[]
    }
  }
}) {
  const event = contract.event
  const location = [event.locationName, event.address, event.city, event.state].filter(Boolean).join(' — ')
  const musicians = event.assignments
    .map((a) => `${a.musician.user.name}${a.roleName ? ` (${a.roleName})` : ''}`)
    .join(', ')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Contrato de Prestação de Serviço</Text>
        <Text style={styles.subtitle}>{agencyName}</Text>

        <View style={styles.box}>
          <View style={styles.row}>
            <Text style={styles.label}>Evento</Text>
            <Text style={styles.value}>{event.title}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Data</Text>
            <Text style={styles.value}>{formatDateBR(event.date)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Local</Text>
            <Text style={styles.value}>{location || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cliente</Text>
            <Text style={styles.value}>{event.client?.name || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total</Text>
            <Text style={styles.value}>{formatCurrencyBRL(contract.totalAmount)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Músicos escalados</Text>
          <Text style={styles.small}>{musicians || '—'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Termos</Text>
          <Text>{contract.terms || '—'}</Text>
        </View>

        <View style={[styles.section, { marginTop: 22 }]}>
          <Text style={styles.small}>
            Identificador do contrato: <Text style={styles.mono}>{contract.id}</Text>
          </Text>
          <Text style={styles.small}>Status: {contract.status}</Text>
        </View>

        <View style={[styles.section, { marginTop: 26 }]}>
          <View style={styles.row}>
            <View style={{ width: '48%' }}>
              <Text style={styles.small}>Assinatura (Cliente)</Text>
              <Text>____________________________________</Text>
            </View>
            <View style={{ width: '48%' }}>
              <Text style={styles.small}>Assinatura ({agencyName})</Text>
              <Text>____________________________________</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

