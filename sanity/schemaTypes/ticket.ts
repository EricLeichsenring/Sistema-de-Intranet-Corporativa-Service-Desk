// schema/ticket.ts
import { defineType, defineField } from 'sanity'

export const ticketType = defineType({
  name: 'chamado',
  title: 'Chamados de Suporte',
  type: 'document',
  fields: [
    defineField({
      name: 'status',
      title: 'Status do Chamado',
      type: 'string',
      options: {
        list: [
          { title: 'Pendente', value: 'pendente' },
          { title: 'Em Andamento', value: 'em_andamento' },
          // --- NOVO STATUS ---
          { title: 'Aguardando', value: 'aguardando' }, 
          { title: 'Concluído', value: 'concluido' },
          { title: 'Cancelado', value: 'cancelado' }, 
        ],
        layout: 'radio'
      },
      initialValue: 'pendente'
    }),
    
    // ... (campos setor, nome, local, tipo, descricao mantidos iguais) ...
    defineField({
      name: 'setor',
      title: 'Setor Responsável',
      type: 'string',
      options: {
        list: [
          { title: 'TI', value: 'ti' },
          { title: 'Manutenção', value: 'manutencao' }
        ],
        layout: 'radio'
      },
      initialValue: 'manutencao'
    }),
    defineField({
      name: 'nome',
      title: 'Nome do Solicitante',
      type: 'string',
    }),
    defineField({
      name: 'local',
      title: 'Local / Setor',
      type: 'string',
    }),
    defineField({
      name: 'tipo',
      title: 'Tipo de Problema',
      type: 'string',
    }),
    defineField({
      name: 'descricao',
      title: 'Descrição',
      type: 'text',
    }),
    
    defineField({
      name: 'materialUtilizado',
      title: 'Material Utilizado',
      type: 'text',
      hidden: ({document}) => document?.status !== 'concluido' 
    }),

    // --- ATUALIZAÇÃO DA JUSTIFICATIVA ---
    defineField({
      name: 'justificativa',
      title: 'Justificativa (Cancelamento ou Espera)',
      type: 'text', 
      // Aparece se for cancelado OU aguardando
      hidden: ({document}) => document?.status !== 'cancelado' && document?.status !== 'aguardando'
    }),

    defineField({
      name: 'anexo',
      title: 'Imagem do Problema',
      type: 'image',
      options: { hotspot: true }
    }),
    defineField({
      name: 'dataAbertura',
      title: 'Data de Abertura',
      type: 'datetime',
      initialValue: () => new Date().toISOString()
    }),
  ]
})