export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agenda_diaria: {
        Row: {
          concluido_em: string | null
          created_at: string
          data_prevista: string
          disciplina_id: number
          faz_parte_meta_dia: boolean
          id: number
          proxima_acao: string
          status: string
          topico_id: number
          user_id: string
        }
        Insert: {
          concluido_em?: string | null
          created_at?: string
          data_prevista: string
          disciplina_id: number
          faz_parte_meta_dia?: boolean
          id?: number
          proxima_acao: string
          status?: string
          topico_id: number
          user_id: string
        }
        Update: {
          concluido_em?: string | null
          created_at?: string
          data_prevista?: string
          disciplina_id?: number
          faz_parte_meta_dia?: boolean
          id?: number
          proxima_acao?: string
          status?: string
          topico_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_diaria_topico_id_fkey"
            columns: ["topico_id"]
            isOneToOne: false
            referencedRelation: "topicos"
            referencedColumns: ["id"]
          },
        ]
      }
      anki_revisoes_diarias: {
        Row: {
          data: string
          feito_em: string
          id: number
          user_id: string
        }
        Insert: {
          data: string
          feito_em?: string
          id?: number
          user_id: string
        }
        Update: {
          data?: string
          feito_em?: string
          id?: number
          user_id?: string
        }
        Relationships: []
      }
      caixa_preta_questoes: {
        Row: {
          assunto: string | null
          created_at: string
          disciplina_id: number | null
          id: number
          numero_questao: number | null
          observacoes: string | null
          passo1_refazer: boolean
          passo2_voltar_conteudo: boolean
          passo3_resolucao_comentada: boolean
          passo4_flashcard: boolean
          simulado_id: number | null
          tipo_erro: number | null
          user_id: string
        }
        Insert: {
          assunto?: string | null
          created_at?: string
          disciplina_id?: number | null
          id?: number
          numero_questao?: number | null
          observacoes?: string | null
          passo1_refazer?: boolean
          passo2_voltar_conteudo?: boolean
          passo3_resolucao_comentada?: boolean
          passo4_flashcard?: boolean
          simulado_id?: number | null
          tipo_erro?: number | null
          user_id: string
        }
        Update: {
          assunto?: string | null
          created_at?: string
          disciplina_id?: number | null
          id?: number
          numero_questao?: number | null
          observacoes?: string | null
          passo1_refazer?: boolean
          passo2_voltar_conteudo?: boolean
          passo3_resolucao_comentada?: boolean
          passo4_flashcard?: boolean
          simulado_id?: number | null
          tipo_erro?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caixa_preta_questoes_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_preta_questoes_simulado_id_fkey"
            columns: ["simulado_id"]
            isOneToOne: false
            referencedRelation: "simulados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_preta_questoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      caixa_preta_redacao: {
        Row: {
          c1: number
          c2: number
          c3: number
          c4: number
          c5: number
          correcao_feita: boolean
          created_at: string
          data: string | null
          id: number
          nota_reescrita: number | null
          observacoes: string | null
          reescrita_feita: boolean
          tema: string | null
          tempo_minutos: number | null
          user_id: string
        }
        Insert: {
          c1?: number
          c2?: number
          c3?: number
          c4?: number
          c5?: number
          correcao_feita?: boolean
          created_at?: string
          data?: string | null
          id?: number
          nota_reescrita?: number | null
          observacoes?: string | null
          reescrita_feita?: boolean
          tema?: string | null
          tempo_minutos?: number | null
          user_id: string
        }
        Update: {
          c1?: number
          c2?: number
          c3?: number
          c4?: number
          c5?: number
          correcao_feita?: boolean
          created_at?: string
          data?: string | null
          id?: number
          nota_reescrita?: number | null
          observacoes?: string | null
          reescrita_feita?: boolean
          tema?: string | null
          tempo_minutos?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caixa_preta_redacao_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cronograma_fases: {
        Row: {
          concluida: boolean
          created_at: string
          data_fim: string
          data_inicio: string
          descricao: string | null
          id: number
          meta_topicos_atingidos: number
          meta_topicos_total: number
          nome: string
          numero_fase: number
          user_id: string
        }
        Insert: {
          concluida?: boolean
          created_at?: string
          data_fim: string
          data_inicio: string
          descricao?: string | null
          id?: number
          meta_topicos_atingidos?: number
          meta_topicos_total?: number
          nome: string
          numero_fase: number
          user_id: string
        }
        Update: {
          concluida?: boolean
          created_at?: string
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          id?: number
          meta_topicos_atingidos?: number
          meta_topicos_total?: number
          nome?: string
          numero_fase?: number
          user_id?: string
        }
        Relationships: []
      }
      disciplinas: {
        Row: {
          area: string
          cor: string
          icone: string | null
          id: number
          nome: string
        }
        Insert: {
          area: string
          cor: string
          icone?: string | null
          id?: number
          nome: string
        }
        Update: {
          area?: string
          cor?: string
          icone?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
      ferramenta_coragem: {
        Row: {
          capitulo: string | null
          created_at: string
          disciplina_id: number | null
          id: number
          importancia: string | null
          observacoes: string | null
          questoes_feitas: boolean
          tema: string | null
          teoria_feita: boolean
          user_id: string
        }
        Insert: {
          capitulo?: string | null
          created_at?: string
          disciplina_id?: number | null
          id?: number
          importancia?: string | null
          observacoes?: string | null
          questoes_feitas?: boolean
          tema?: string | null
          teoria_feita?: boolean
          user_id: string
        }
        Update: {
          capitulo?: string | null
          created_at?: string
          disciplina_id?: number | null
          id?: number
          importancia?: string | null
          observacoes?: string | null
          questoes_feitas?: boolean
          tema?: string | null
          teoria_feita?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferramenta_coragem_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferramenta_coragem_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_semanal: {
        Row: {
          dia_semana: number
          disciplina_id: number
          id: number
          ordem: number
          user_id: string
        }
        Insert: {
          dia_semana: number
          disciplina_id: number
          id?: number
          ordem?: number
          user_id: string
        }
        Update: {
          dia_semana?: number
          disciplina_id?: number
          id?: number
          ordem?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_semanal_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_semanal_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          anki_lembrete_ativo: boolean
          anki_lembrete_horario: string
          created_at: string
          data_prova: string | null
          id: string
          meta_acerto_pct: number
          meta_diaria_questoes: number
          meta_topicos_dia: number
          modo_atraso: string | null
          nivel_dedicacao: string | null
          nivel_meta: string
          nome: string | null
          objetivo_cobertura: string | null
          repertorios_trocas_count: number
          repertorios_trocas_data: string | null
        }
        Insert: {
          anki_lembrete_ativo?: boolean
          anki_lembrete_horario?: string
          created_at?: string
          data_prova?: string | null
          id: string
          meta_acerto_pct?: number
          meta_diaria_questoes?: number
          meta_topicos_dia?: number
          modo_atraso?: string | null
          nivel_dedicacao?: string | null
          nivel_meta?: string
          nome?: string | null
          objetivo_cobertura?: string | null
          repertorios_trocas_count?: number
          repertorios_trocas_data?: string | null
        }
        Update: {
          anki_lembrete_ativo?: boolean
          anki_lembrete_horario?: string
          created_at?: string
          data_prova?: string | null
          id?: string
          meta_acerto_pct?: number
          meta_diaria_questoes?: number
          meta_topicos_dia?: number
          modo_atraso?: string | null
          nivel_dedicacao?: string | null
          nivel_meta?: string
          nome?: string | null
          objetivo_cobertura?: string | null
          repertorios_trocas_count?: number
          repertorios_trocas_data?: string | null
        }
        Relationships: []
      }
      repertorios_catalogo: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          descricao: string
          dica_uso: string | null
          id: number
          nome: string
          subtitulo: string | null
          temas_relacionados: string[] | null
        }
        Insert: {
          ativo?: boolean
          categoria: string
          created_at?: string
          descricao: string
          dica_uso?: string | null
          id?: number
          nome: string
          subtitulo?: string | null
          temas_relacionados?: string[] | null
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          descricao?: string
          dica_uso?: string | null
          id?: number
          nome?: string
          subtitulo?: string | null
          temas_relacionados?: string[] | null
        }
        Relationships: []
      }
      repertorios_diarios: {
        Row: {
          data: string
          id: number
          ja_conhece: boolean
          repertorio_id: number
          salvo: boolean
          user_id: string
          visto_em: string
        }
        Insert: {
          data?: string
          id?: number
          ja_conhece?: boolean
          repertorio_id: number
          salvo?: boolean
          user_id: string
          visto_em?: string
        }
        Update: {
          data?: string
          id?: number
          ja_conhece?: boolean
          repertorio_id?: number
          salvo?: boolean
          user_id?: string
          visto_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "repertorios_diarios_repertorio_id_fkey"
            columns: ["repertorio_id"]
            isOneToOne: false
            referencedRelation: "repertorios_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      sequencia_didatica_padrao: {
        Row: {
          created_at: string
          depende_de: string[]
          disciplina_slug: string
          id: number
          ordem: number
          tema: string
        }
        Insert: {
          created_at?: string
          depende_de?: string[]
          disciplina_slug: string
          id?: number
          ordem: number
          tema: string
        }
        Update: {
          created_at?: string
          depende_de?: string[]
          disciplina_slug?: string
          id?: number
          ordem?: number
          tema?: string
        }
        Relationships: []
      }
      sessoes_estudo: {
        Row: {
          concluido: boolean
          concluido_em: string | null
          data: string
          id: number
          tipo_atividade: string
          topico_id: number
          user_id: string
        }
        Insert: {
          concluido?: boolean
          concluido_em?: string | null
          data: string
          id?: number
          tipo_atividade: string
          topico_id: number
          user_id: string
        }
        Update: {
          concluido?: boolean
          concluido_em?: string | null
          data?: string
          id?: number
          tipo_atividade?: string
          topico_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_estudo_topico_id_fkey"
            columns: ["topico_id"]
            isOneToOne: false
            referencedRelation: "topicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_estudo_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      simulados: {
        Row: {
          created_at: string
          data: string | null
          humanas_acertos: number | null
          id: number
          linguagens_acertos: number | null
          matematica_acertos: number | null
          naturezas_acertos: number | null
          nome: string
          observacoes: string | null
          redacao_nota: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: string | null
          humanas_acertos?: number | null
          id?: number
          linguagens_acertos?: number | null
          matematica_acertos?: number | null
          naturezas_acertos?: number | null
          nome: string
          observacoes?: string | null
          redacao_nota?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string | null
          humanas_acertos?: number | null
          id?: number
          linguagens_acertos?: number | null
          matematica_acertos?: number | null
          naturezas_acertos?: number | null
          nome?: string
          observacoes?: string | null
          redacao_nota?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulados_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topico_prerequisitos: {
        Row: {
          created_at: string
          id: number
          prerequisito_topico_id: number
          topico_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          prerequisito_topico_id: number
          topico_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          prerequisito_topico_id?: number
          topico_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topico_prerequisitos_prerequisito_topico_id_fkey"
            columns: ["prerequisito_topico_id"]
            isOneToOne: false
            referencedRelation: "topicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topico_prerequisitos_topico_id_fkey"
            columns: ["topico_id"]
            isOneToOne: false
            referencedRelation: "topicos"
            referencedColumns: ["id"]
          },
        ]
      }
      topicos: {
        Row: {
          created_at: string
          disciplina_id: number
          dominado: boolean
          dominado_em: string | null
          flashcards_feitos: boolean
          id: number
          mapeamento_data: string | null
          mapeamento_feito: boolean
          observacoes: string | null
          ordem_didatica: number
          pre_aula_acertos: number
          pre_aula_feita: boolean
          questoes_acertos: number
          questoes_feitas: number
          recorrencia: string
          revisao1_acertos: number
          revisao1_agendada_para: string | null
          revisao1_data: string | null
          revisao1_feita: boolean
          revisao2_acertos: number
          revisao2_agendada_para: string | null
          revisao2_data: string | null
          revisao2_feita: boolean
          subtema: string | null
          tema: string
          teoria_data: string | null
          teoria_feita: boolean
          ultima_atividade: string
          user_id: string
        }
        Insert: {
          created_at?: string
          disciplina_id: number
          dominado?: boolean
          dominado_em?: string | null
          flashcards_feitos?: boolean
          id?: number
          mapeamento_data?: string | null
          mapeamento_feito?: boolean
          observacoes?: string | null
          ordem_didatica?: number
          pre_aula_acertos?: number
          pre_aula_feita?: boolean
          questoes_acertos?: number
          questoes_feitas?: number
          recorrencia?: string
          revisao1_acertos?: number
          revisao1_agendada_para?: string | null
          revisao1_data?: string | null
          revisao1_feita?: boolean
          revisao2_acertos?: number
          revisao2_agendada_para?: string | null
          revisao2_data?: string | null
          revisao2_feita?: boolean
          subtema?: string | null
          tema: string
          teoria_data?: string | null
          teoria_feita?: boolean
          ultima_atividade?: string
          user_id: string
        }
        Update: {
          created_at?: string
          disciplina_id?: number
          dominado?: boolean
          dominado_em?: string | null
          flashcards_feitos?: boolean
          id?: number
          mapeamento_data?: string | null
          mapeamento_feito?: boolean
          observacoes?: string | null
          ordem_didatica?: number
          pre_aula_acertos?: number
          pre_aula_feita?: boolean
          questoes_acertos?: number
          questoes_feitas?: number
          recorrencia?: string
          revisao1_acertos?: number
          revisao1_agendada_para?: string | null
          revisao1_data?: string | null
          revisao1_feita?: boolean
          revisao2_acertos?: number
          revisao2_agendada_para?: string | null
          revisao2_data?: string | null
          revisao2_feita?: boolean
          subtema?: string | null
          tema?: string
          teoria_data?: string | null
          teoria_feita?: boolean
          ultima_atividade?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topicos_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topicos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adicionar_topico_extra: { Args: { p_user_id: string }; Returns: number }
      ajustar_meta_diaria_automatica: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      atualizar_status_dominado: {
        Args: { p_topico_id: number }
        Returns: undefined
      }
      calcular_status_cronograma: {
        Args: { p_user_id: string }
        Returns: {
          dias_atraso: number
          dias_restantes_fase: number
          dias_restantes_prova: number
          faltam: number
          fase_atual_nome: string
          fase_atual_numero: number
          fase_data_fim: string
          fase_data_inicio: string
          feitos: number
          mensagem: string
          meta_total: number
          severidade: string
          topicos_dia_necessario: number
          topicos_dia_ritmo_atual: number
        }[]
      }
      garantir_plano_dia: { Args: { p_user_id: string }; Returns: undefined }
      inicializar_cronograma: {
        Args: { p_data_prova: string; p_user_id: string }
        Returns: undefined
      }
      listar_prerequisitos_com_progresso: {
        Args: { p_topico_id: number; p_user_id: string }
        Returns: {
          dominado: boolean
          pct_acertos: number
          pct_consolidacao: number
          prerequisito_id: number
          prerequisito_subtema: string
          prerequisito_tema: string
          proxima_acao: string
        }[]
      }
      popular_agenda_dia: {
        Args: { p_data: string; p_user: string }
        Returns: number
      }
      popular_prerequisitos_user: {
        Args: { p_user_id: string }
        Returns: number
      }
      sortear_repertorio_dia: { Args: { p_user_id: string }; Returns: number }
      topico_esta_dominado: { Args: { p_topico_id: number }; Returns: boolean }
      trocar_repertorio_dia: { Args: { p_user_id: string }; Returns: number }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
