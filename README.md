# Órion Lab - Laboratório de Arquitetura Teológica

Órion Lab é um sistema de expansão estrutural para organização de ideias teológicas. "Antes da mensagem, a arquitetura."

## Stack
- **Frontend**: React + Vite + Tailwind CSS + Zustand + Motion
- **Backend/DB**: Supabase (Auth + Postgres + RLS)
- **IA**: Gemini API (via Supabase Edge Functions)
- **Nota**: Gemini API Key fica SOMENTE no servidor (Supabase secrets). Nada no frontend.

## Como Rodar Localmente
1. Instale as dependências: `npm install`
2. Configure as variáveis de ambiente no arquivo `.env`:
   - `VITE_SUPABASE_URL`: URL do seu projeto Supabase.
   - `VITE_SUPABASE_ANON_KEY`: Chave anônima do seu projeto Supabase.
3. Inicie o servidor de desenvolvimento: `npm run dev`

## Gemini via Supabase Edge Functions
A análise teológica é feita server-side utilizando Gemini via Supabase Edge Functions, garantindo segurança (nenhuma chave no frontend).

### Configurar Gemini API Key
1. Gere uma chave de API em [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Configure como secret no Supabase:
   ```bash
   supabase secrets set GEMINI_API_KEY=seu_gemini_api_key
   ```
3. Para ambiente local com Supabase, use `.env.local` na pasta `supabase/`:
   ```bash
   GEMINI_API_KEY=seu_gemini_api_key
   ```

### Testar Edge Function Localmente
1. Inicie o Supabase local:
   ```bash
   supabase start
   ```
2. Em outro terminal, serve as functions:
   ```bash
   supabase functions serve
   ```
3. Teste com curl:
   ```bash
   curl -X POST http://localhost:54321/functions/v1/analyze_idea \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer seu_token_jwt" \
     -d '{"text":"Cristo precisava morrer."}'
   ```
   (Remova o `Authorization` se não estiver autenticado; a function aceita ambos os modos.)

### Como Funciona
- Frontend chama `supabase.functions.invoke('analyze_idea', { body: { text } })`
- Edge Function (Deno) recebe o texto, aplica guardrails anti-sermão, chama Gemini
- Resposta é validada contra contrato JSON rígido
- Se válida, retorna; se inválida, tenta 1 retry ou fallback controlado
- Frontend exibe resultado ou aviso "Análise indisponível (modo local)"

## Configuração do Supabase
1. Crie um novo projeto no Supabase.
2. Execute o conteúdo de `supabase_schema.sql` no Editor SQL do Supabase para criar as tabelas e políticas de RLS.
3. Configure os provedores de autenticação (Google, Phone, Email) no painel de Auth do Supabase.
4. Configure a chave Gemini nos secrets (veja seção "Gemini via Supabase Edge Functions" acima).

## Google Calendar Integration
1. Configure o OAuth no Google Cloud Console.
2. Adicione os escopos `https://www.googleapis.com/auth/calendar.events`.
3. Configure a URL de redirecionamento para o seu endpoint de callback (ex: `/auth/callback`).

## Critérios de Aceite
- **Caos Total**: Digite qualquer texto no campo central para gerar uma análise estrutural fixa.
- **Detecção de Versículo**: Entradas como "Isaías 53" ativam a aba de Exegese.
- **Mapa Estrutural**: Clique no botão no topo para ver a distribuição de eixos e tipos.
- **PWA**: O app é instalável e possui suporte básico a offline-read.
