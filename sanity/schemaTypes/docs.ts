import { defineType, defineField } from 'sanity'

export const docsType = defineType({
  name: 'documentosImpressao',
  title: 'Documentos para Impressão',
  type: 'document',
  fields: [
    defineField({
      name: 'titulo',
      title: 'Nome do Documento',
      type: 'string',
      validation: Rule => Rule.required()
    }),
    // NOVO CAMPO: SETOR
    defineField({
      name: 'setor',
      title: 'Setor / Unidade',
      type: 'string',
      options: {
        list: [
          { title: 'Hospital (H.M.G)', value: 'Hospital H.M.G' },
          { title: 'Pronto Socorro (PS)', value: 'RH' },
          { title: 'Unidade Básica de Saúde (UBS)', value: 'UBS' },
          { title: 'Pop H.M.G (POP-H.M.G)', value: 'Pop-H.M.G' },
          { title: 'Pop PS (POP-PS)', value: 'Pop-PS' },
        ],
      },
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'arquivo',
      title: 'Arquivo (PDF/DOC)',
      type: 'file',
      options: { accept: '.pdf,.doc,.docx' },
      validation: Rule => Rule.required()
    })
  ]
})