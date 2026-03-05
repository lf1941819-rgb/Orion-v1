# Órion Lab - Laboratório de Arquitetura Teológica

Órion Lab é um sistema de expansão estrutural para organização de ideias teológicas. "Antes da mensagem, a arquitetura."

## Stack
- **Frontend**: React + Vite + Tailwind CSS + Zustand + Motion
- **Backend/DB**: Supabase (Auth + Postgres + RLS)
- **IA**: Gemini API (via @google/genai)
- **Nota**: Gemini API Key não é usada no frontend; a integração será feita via Supabase Edge Functions.

## Como Rodar Localmente
1. Instale as dependências: `npm install`
2. Configure as variáveis de ambiente no arquivo `.env`:
   - `GEMINI_API_KEY`: Sua chave da API do Google Gemini.
   - `VITE_SUPABASE_URL`: URL do seu projeto Supabase.
   - `VITE_SUPABASE_ANON_KEY`: Chave anônima do seu projeto Supabase.
3. Inicie o servidor de desenvolvimento: `npm run dev`

## Configuração do Supabase
1. Crie um novo projeto no Supabase.
2. Execute o conteúdo de `supabase_schema.sql` no Editor SQL do Supabase para criar as tabelas e políticas de RLS.
3. Configure os provedores de autenticação (Google, Phone, Email) no painel de Auth do Supabase.
4. Para o "Instagram", use o provedor Facebook no Supabase e configure o App no Meta for Developers.

## Google Calendar Integration
1. Configure o OAuth no Google Cloud Console.
2. Adicione os escopos `https://www.googleapis.com/auth/calendar.events`.
3. Configure a URL de redirecionamento para o seu endpoint de callback (ex: `/auth/callback`).

## Critérios de Aceite
- **Caos Total**: Digite qualquer texto no campo central para gerar uma análise estrutural fixa.
- **Detecção de Versículo**: Entradas como "Isaías 53" ativam a aba de Exegese.
- **Mapa Estrutural**: Clique no botão no topo para ver a distribuição de eixos e tipos.
- **PWA**: O app é instalável e possui suporte básico a offline-read.
