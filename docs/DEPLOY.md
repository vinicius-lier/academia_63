# Deploy e Operacao

## 1. Configuracao do Frontend

1. Edite `js/config.js` com os valores do seu projeto Supabase.
2. Para novos ambientes, copie `js/config.example.js` para `js/config.js`.
3. Publique os arquivos estaticos (`index.html`, `inscricao.html`, `login.html`, `dashboard.html`, `css/`, `js/`, `assets/`).

## 2. SQL no Supabase

Execute no SQL Editor:

1. `supabase/sql/001_schema_and_policies.sql`
2. `supabase/sql/002_storage_parq.sql`
3. `supabase/sql/003_admin_bootstrap.sql` (trocar UUID do admin)
4. `supabase/sql/004_student_documents.sql`
5. `supabase/sql/005_storage_parq_public_insert.sql`
6. `supabase/sql/006_contract_discount_fields.sql`

## 3. Checklist de Producao

1. Formulario de `inscricao.html` salva em `students`, `guardians` (quando menor) e `parq_responses`.
2. PDF baixa no navegador e sobe para bucket `parq-pdfs`.
3. `parq_responses.pdf_url` fica preenchido.
4. Sem aceite de contrato, inscricao salva sem geracao de contrato e sem elegibilidade de desconto.
5. Com aceite de contrato, gera PDF para leitura/impressao e opcao de assinatura por clique no proprio site.
6. Login admin em `login.html` funciona para usuario presente em `admin_users`.
7. Dashboard busca alunos, edita observacoes, abre/imprime contrato e sobe documentos.
8. Upload/listagem em `student_documents` e bucket `student-documents` funcionando.

## 4. Operacao Diaria

1. Inscricoes entram pelo site publico.
2. Administrativo acessa `dashboard.html`.
3. Contratos podem ser visualizados/baixados; fallback gera PDF para registros antigos sem `pdf_url`.
4. Documentos extras (RG, atestado, PDF assinado) sao anexados por aluno no dashboard.
