import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { formatCurrencyBRL } from '@/lib/format'

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 11, fontFamily: 'Helvetica' },
  headerTitle: { fontSize: 18, marginBottom: 4 },
  headerSubtitle: { fontSize: 12, marginBottom: 12, color: '#333' },
  box: { padding: 12, backgroundColor: '#F7F7F7', borderRadius: 8 },
  section: { marginTop: 12, paddingTop: 12, borderTop: '1 solid #DDD' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  label: { color: '#555' },
  value: { color: '#111' },
  h2: { fontSize: 12, marginBottom: 8, color: '#111' },
  p: { marginBottom: 6, lineHeight: 1.35, color: '#111' },
  small: { fontSize: 10, color: '#444', lineHeight: 1.3 },
  bulletRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  bullet: { width: 10, color: '#111' },
  mono: { fontFamily: 'Courier' },
})

function joinList(list: string[]) {
  const cleaned = list.map((x) => x.trim()).filter(Boolean)
  return cleaned.length ? cleaned.join(', ') : '—'
}

export function createBudgetPdf({
  agencyName,
  client,
  request,
  pricing,
}: {
  agencyName: string
  client: { fullName: string; company: string | null; phone: string; email: string }
  request: {
    youAre: string[]
    eventTypes: string[]
    coupleName: string | null
    eventDateTimeCity: string
    expectations: string
    instruments: Array<{ name: string; qty: number }>
  }
  pricing: { originalCents: number; discountPct: number; discountCents: number; finalCents: number } | null
}) {
  const formation =
    request.instruments.length === 0
      ? 'A definir (vamos orientar a melhor escolha)'
      : request.instruments
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((i) => `${i.name} x${i.qty}`)
          .join(', ')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.headerTitle}>Orçamento — {agencyName}</Text>
        <Text style={styles.headerSubtitle}>Proposta de formação musical e sonorização para evento</Text>

        <View style={styles.box}>
          <View style={styles.row}>
            <Text style={styles.label}>Cliente</Text>
            <Text style={styles.value}>{client.fullName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Empresa</Text>
            <Text style={styles.value}>{client.company || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Contato</Text>
            <Text style={styles.value}>
              {client.phone} · {client.email}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Dados do evento</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Você é</Text>
            <Text style={styles.value}>{joinList(request.youAre)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Evento</Text>
            <Text style={styles.value}>{joinList(request.eventTypes)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Nome do casal</Text>
            <Text style={styles.value}>{request.coupleName || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Data / Hora / Cidade</Text>
            <Text style={styles.value}>{request.eventDateTimeCity}</Text>
          </View>
          <View style={{ marginTop: 8 }}>
            <Text style={styles.label}>Expectativa musical</Text>
            <Text style={[styles.p, { marginTop: 4 }]}>{request.expectations}</Text>
          </View>
          <View style={{ marginTop: 6 }}>
            <Text style={styles.label}>Formação musical</Text>
            <Text style={[styles.p, { marginTop: 4 }]}>{formation}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Estrutura de sonorização</Text>
          <Text style={styles.p}>
            Nossa estrutura de sonorização é pensada para garantir qualidade, clareza e segurança em todo o evento. Contamos com caixas de som de alta qualidade,
            dimensionadas de acordo com o espaço, mesa de som profissional, além de microfones adequados para músicos e celebrante, garantindo que cada detalhe seja ouvido com nitidez.
          </Text>
          <Text style={styles.p}>
            Disponibilizamos também retornos para os músicos, assegurando precisão na execução, e saída de áudio direta da mesa para fotógrafos e filmagem, facilitando a captação com qualidade profissional.
          </Text>
          <Text style={styles.p}>
            Toda a operação é acompanhada por um técnico de som especializado e um auxiliar, presentes durante todo o evento, responsáveis por manter o equilíbrio sonoro, ajustes em tempo real e pronta atuação em qualquer eventualidade.
          </Text>
          <Text style={styles.p}>
            Nosso objetivo é que tudo funcione com perfeição — e, caso qualquer ajuste seja necessário, ele é realizado de forma imediata, sem impactar o andamento da cerimônia.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Sobre a proposta</Text>
          <Text style={styles.p}>
            A Essência Musical é especializada em eventos sociais e corporativos, NÃO atuando em formatos como baladas/pista de dança, eventos de rua de grande porte, manifestações públicas ou campanhas políticas.
          </Text>
          <Text style={styles.p}>
            Nossa proposta é voltada para uma sonorização mais elegante e sofisticada, ideal para recepções, almoços e/ou jantares executivos, e momentos sociais após a cerimônia.
          </Text>
          <Text style={styles.p}>
            Realizamos a ambientação musical da festa com qualidade, equilíbrio e bom gosto, criando um clima agradável e envolvente, sem perder a essência do evento.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Arranjos musicais</Text>
          <Text style={styles.p}>
            Na Essência Musical, trabalhamos com arranjos personalizados, desenvolvidos especialmente para cada evento. O arranjo é a forma como a música é adaptada e organizada para os instrumentos que estarão presentes no dia.
          </Text>
          <Text style={styles.p}>
            Para isso, contamos com uma equipe de arranjadores profissionais, responsáveis por toda a produção musical. Essa equipe adapta cada música para a formação escolhida, define o papel de cada instrumento,
            ajusta tonalidade, introduções e finalizações, garante equilíbrio, harmonia e fluidez na execução e prepara as partituras que serão executadas pelos músicos.
          </Text>
          <Text style={styles.p}>
            O ajuste das músicas poderá ser diretamente com o arranjador, por meio de um canal oficial da Essência Musical, alinhando repertório, ideias e detalhes musicais com quem realmente está responsável pela criação dos arranjos.
          </Text>
          <Text style={styles.p}>
            Dessa forma, garantimos que cada música seja tratada com cuidado, intenção e sensibilidade, resultando em uma trilha sonora personalizada, elegante e fiel ao significado de cada momento do casamento.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Equipe e substituição</Text>
          <Text style={styles.p}>
            A Essência Musical trabalha com uma equipe de músicos profissionais cuidadosamente selecionados, garantindo padrão elevado de qualidade em todas as apresentações.
          </Text>
          <Text style={styles.p}>
            Para assegurar a tranquilidade dos nossos clientes, contamos também com músicos substitutos preparados, que atuam sempre que necessário, sem comprometer o nível técnico e artístico do evento.
            Isso significa que, independentemente de qualquer imprevisto, a formação contratada será mantida.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Condições</Text>
          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.small}>Validade: 7 dias após o envio. Após o 3° dia, sujeito a disponibilidade da data.</Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.small}>Pagamento: cartão de crédito (com juros) ou Pix.</Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.small}>
              Para reserva da data, pagamento inicial de 10% do valor total. O restante poderá ser quitado via Pix até 20 dias antes da data do casamento.
            </Text>
          </View>
        </View>

        {pricing ? (
          <View style={styles.section}>
            <Text style={styles.h2}>Valores</Text>
            <View style={styles.box}>
              <View style={styles.row}>
                <Text style={styles.label}>Valor original</Text>
                <Text style={styles.value}>{formatCurrencyBRL(pricing.originalCents)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Desconto</Text>
                <Text style={styles.value}>
                  {pricing.discountPct}% ({formatCurrencyBRL(pricing.discountCents)})
                </Text>
              </View>
              <View style={[styles.row, { marginTop: 6 }]}>
                <Text style={[styles.label, { fontSize: 12 }]}>Valor final</Text>
                <Text style={[styles.value, { fontSize: 12 }]}>{formatCurrencyBRL(pricing.finalCents)}</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={[styles.section, { marginTop: 18 }]}>
          <Text style={styles.small}>
            Documento gerado automaticamente pelo sistema {agencyName}.{' '}
            <Text style={styles.mono}>
              {new Date().toISOString().slice(0, 10)}-{Math.random().toString(36).slice(2, 8)}
            </Text>
          </Text>
        </View>
      </Page>
    </Document>
  )
}

