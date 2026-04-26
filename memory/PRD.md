# Docnode by Keynode — PRD

## Visão geral
Docnode é um app mobile-first (Expo + FastAPI + MongoDB) para organizar documentos pessoais e familiares, com lembretes de vencimento. Marca principal: **Docnode**. Empresa-mãe: **Keynode** (assinatura discreta "Docnode by Keynode").

## Público-alvo
Famílias brasileiras (não-técnicas) que querem organização simples e segura de documentos importantes, com alertas de vencimento.

## MVP escopo (entregue)
1. **Autenticação JWT** (registro, login, recuperação simulada, logout, exclusão de conta com cascade).
2. **Familiares**: CRUD com avatar opcional (base64), parentesco, observações.
3. **Documentos**: CRUD com upload PDF/imagem (base64), tipo, vinculação a familiar, datas de emissão/vencimento, observações.
4. **Status automático**: ativo / vencendo_em_breve (≤30 dias) / vencido / sem_vencimento.
5. **Lembretes**: 7, 15, 30, 60, 90 dias antes (somente in-app).
6. **Dashboard**: contadores, próximos vencimentos, busca rápida, atalhos.
7. **Vencimentos**: agrupados (vencidos, próximos 7, próximos 30, depois).
8. **Busca & filtros**: por nome, familiar, tipo, status.
9. **Compartilhamento**: nativo (mobile via expo-sharing) ou download (web).
10. **Configurações**: editar nome, alterar senha, sobre, sair, excluir conta.
11. **Privacidade**: cada usuário só vê seus dados; cascade na exclusão; aviso de irreversibilidade.

## Fora do escopo (intencional)
IA/OCR/leitura automática, gov.br, Google Drive, push notifications, assinatura paga, colaboração em tempo real, super app.

## Stack
- Frontend: Expo SDK 54 (Expo Router, react-native-reanimated, @expo-google-fonts Poppins + Plus Jakarta Sans)
- Backend: FastAPI + Motor (MongoDB) + bcrypt + PyJWT
- Storage: arquivos como base64 em MongoDB (sem URLs públicas)
- Auth: Bearer token (mobile) + cookies httpOnly (compatibilidade)

## Telas
Login, Cadastro, Recuperar senha, Dashboard, Documentos (lista+filtros), Detalhe doc, Novo doc, Editar doc, Vencimentos, Família (lista), Familiar (form), Configurações, Sobre.

## Métricas de sucesso (sugeridas)
- Tempo até primeiro documento cadastrado < 90s.
- % de usuários com ≥1 lembrete configurado.
- Retenção D7 ≥ 30%.

## Roadmap (próximas fases)
- Push notifications reais (Expo Notifications).
- Compartilhamento familiar com permissões.
- Backup criptografado em nuvem (assinatura paga).
- OCR opcional para autopreencher campos.
