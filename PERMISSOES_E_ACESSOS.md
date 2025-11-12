# 🔐 Permissões e Acessos por Tipo de Usuário

## 📋 Hierarquia de Usuários

### 1️⃣ Superadmin (Dono do Sistema)
**Quem é**: Proprietário/desenvolvedor do sistema AnchorView

#### ✅ Acesso Completo a TUDO
- **Dashboard Admin** (`/admin`)
  - Gerenciar todas as empresas
  - Ver estatísticas globais
  - Gerenciar planos e assinaturas
  - Logs de atividades do sistema
  - Backup e restore de dados

- **Todas as funcionalidades de outros roles**
- **Gestão de empresas**
  - Criar/editar/excluir empresas
  - Gerenciar planos de assinatura
  - Controlar limites de uso
  - Ativar/desativar empresas

---

### 2️⃣ Company Admin (Administradora do Prédio)
**Quem é**: Empresa de administração predial, síndico profissional, gestor do condomínio

#### ✅ Páginas e Funcionalidades

**📊 Dashboard Principal** (`/app`)
- ✅ Visualizar todos os projetos da empresa
- ✅ Ver estatísticas gerais
- ✅ Acessar todos os prédios sob gestão

**🏢 Gestão de Projetos**
- ✅ **Criar novos projetos** (prédios/empreendimentos)
- ✅ **Editar informações** dos projetos
- ✅ **Adicionar plantas baixas**
- ✅ **Definir localizações** (endereços, blocos)
- ✅ Excluir projetos

**👥 Gestão de Usuários** (`/configuracoes`)
- ✅ **Convidar líderes de equipe** (team_admin)
- ✅ **Convidar técnicos** (technician)
- ✅ Ver lista de todos os usuários
- ✅ Editar permissões básicas
- ❌ **NÃO pode convidar outros company_admins**

**🏗️ Inspeções de Fachada** (`/app` → Aba Fachadas)
- ✅ **Ver todas as inspeções**
- ✅ **Criar novas inspeções**
- ✅ Ver status e relatórios
- ⚠️ **Ver mapas (SOMENTE LEITURA)**
  - Pode visualizar patologias marcadas
  - NÃO pode criar/editar/excluir pontos
  - NÃO pode desenhar patologias
- ✅ **Gerenciar categorias de patologias**
- ✅ **Ver página de patologias** (`/patologias`)
  - Ver todas as patologias
  - Filtrar por tipo, localização
  - Ver observações e fotos

**📍 Pontos de Ancoragem** (Aba Pontos)
- ⚠️ **Ver pontos (SOMENTE LEITURA)**
  - Pode visualizar pontos no mapa
  - NÃO pode criar novos pontos
  - NÃO pode editar pontos existentes
  - NÃO pode excluir pontos

**📋 Testes e Inspeções** (Aba Testes)
- ✅ Ver histórico de testes
- ✅ Ver resultados e status
- ❌ NÃO pode realizar testes

**💰 Assinaturas e Billing** (`/billing`)
- ✅ Gerenciar assinatura da empresa
- ✅ Ver limites de uso
- ✅ Atualizar forma de pagamento

#### ❌ Restrições
- ❌ **NÃO pode editar mapas de fachada**
- ❌ **NÃO pode criar/editar pontos de ancoragem**
- ❌ **NÃO pode realizar testes**
- ❌ **NÃO pode acessar painel admin** (`/admin`)

---

### 3️⃣ Team Admin (Líder da Equipe de Alpinismo)
**Quem é**: Responsável técnico da empresa de alpinismo, coordenador de equipe

#### ✅ Páginas e Funcionalidades

**📊 Dashboard** (`/app`)
- ✅ Ver **projetos atribuídos à sua equipe**
- ✅ Ver estatísticas dos projetos sob sua responsabilidade
- ⚠️ **NÃO vê todos os projetos da administradora**

**🏗️ Inspeções de Fachada - ACESSO COMPLETO**
- ✅ **Ver inspeções** dos projetos atribuídos
- ✅ **Criar novas inspeções**
- ✅ **Editar mapas de fachada** ⭐
  - Adicionar plantas/fotos de fachadas
  - Configurar andares e divisões
  - Criar linhas guia
- ✅ **Marcar patologias** ⭐
  - Desenhar polígonos e retângulos
  - Categorizar patologias
  - Adicionar fotos
  - Adicionar observações
  - Editar/excluir marcações
- ✅ **Gerenciar categorias de patologias**
- ✅ **Ver e filtrar todas as patologias** (`/patologias`)
- ✅ **Controlar visibilidade de linhas guia**
- ✅ **Filtrar patologias por tipo**

**📍 Pontos de Ancoragem - ACESSO COMPLETO**
- ✅ **Criar novos pontos** ⭐
  - Clicar no mapa para adicionar
  - Criar progressões (múltiplos pontos)
  - Definir numeração
- ✅ **Editar pontos existentes**
  - Mover no mapa
  - Alterar informações
  - Atualizar status
- ✅ **Excluir pontos** (arquivar)
- ✅ **Visualizar histórico**

**📋 Testes e Inspeções**
- ✅ **Realizar testes** nos pontos
- ✅ **Registrar resultados**
- ✅ **Adicionar fotos e lacres**
- ✅ **Ver histórico completo**
- ✅ **Exportar relatórios**

**👥 Gestão de Equipe** (`/configuracoes`)
- ✅ **Convidar técnicos** para sua equipe
- ✅ Ver membros da equipe
- ❌ **NÃO pode convidar outros team_admins**
- ❌ **NÃO pode convidar company_admins**

**📄 Relatórios**
- ✅ Gerar relatórios de inspeções
- ✅ Exportar dados (Excel, PDF)
- ✅ Gerar laudos técnicos

#### ❌ Restrições
- ❌ **NÃO pode criar projetos** (prédios)
- ❌ **NÃO pode excluir projetos**
- ❌ **Só vê projetos atribuídos à sua equipe**
- ❌ **NÃO pode gerenciar assinaturas**
- ❌ **NÃO pode acessar painel admin**

---

### 4️⃣ Technician (Técnico de Campo)
**Quem é**: Alpinista industrial, técnico em altura que executa os testes

#### ✅ Páginas e Funcionalidades

**📊 Dashboard** (`/app`)
- ✅ Ver **projetos onde foi designado**
- ✅ Ver **pontos que precisa inspecionar**
- ⚠️ Visão limitada

**📋 Realizar Testes - FOCO PRINCIPAL**
- ✅ **Realizar testes nos pontos** ⭐
  - Registrar carga aplicada
  - Adicionar número de lacre
  - Tirar fotos
  - Adicionar observações
  - Marcar aprovado/reprovado
- ✅ **Ver histórico de testes**
- ✅ **Trabalho offline** (PWA)
  - Capturar fotos sem internet
  - Sincronizar depois

**📍 Pontos de Ancoragem - SOMENTE LEITURA**
- ✅ **Ver pontos no mapa**
- ✅ Ver informações dos pontos
- ❌ **NÃO pode criar pontos**
- ❌ **NÃO pode editar pontos**
- ❌ **NÃO pode excluir pontos**

**🏗️ Inspeções de Fachada - SOMENTE LEITURA**
- ✅ **Ver patologias marcadas**
- ✅ Ver observações
- ❌ **NÃO pode criar patologias**
- ❌ **NÃO pode editar patologias**
- ❌ **NÃO pode marcar no mapa**

#### ❌ Restrições MÁXIMAS
- ❌ **NÃO pode criar projetos**
- ❌ **NÃO pode criar pontos**
- ❌ **NÃO pode editar nada no mapa**
- ❌ **NÃO pode convidar usuários**
- ❌ **NÃO pode gerenciar equipes**
- ❌ **NÃO pode acessar configurações avançadas**
- ❌ **NÃO pode gerar relatórios** (apenas seus testes)

---

## 📑 Resumo Comparativo

| Funcionalidade | Superadmin | Company Admin | Team Admin | Technician |
|---------------|------------|---------------|------------|------------|
| **Criar Projetos** | ✅ | ✅ | ❌ | ❌ |
| **Editar Mapas de Fachada** | ✅ | ❌ | ✅ | ❌ |
| **Marcar Patologias** | ✅ | ❌ | ✅ | ❌ |
| **Ver Patologias** | ✅ | ✅ | ✅ | ✅ |
| **Criar Pontos de Ancoragem** | ✅ | ❌ | ✅ | ❌ |
| **Editar Pontos** | ✅ | ❌ | ✅ | ❌ |
| **Ver Pontos** | ✅ | ✅ | ✅ | ✅ |
| **Realizar Testes** | ✅ | ❌ | ✅ | ✅ |
| **Convidar Usuários** | ✅ | ✅ (limitado) | ✅ (só técnicos) | ❌ |
| **Gerenciar Assinaturas** | ✅ | ✅ | ❌ | ❌ |
| **Painel Admin** | ✅ | ❌ | ❌ | ❌ |
| **Trabalho Offline (PWA)** | ✅ | ✅ | ✅ | ✅ |

---

## 🔑 Fluxo de Trabalho Típico

### 1. **Company Admin** (Administradora)
1. Cria projeto do prédio
2. Adiciona planta baixa
3. Convida equipe de alpinismo (team_admin)
4. Monitora progresso
5. Recebe relatórios finais

### 2. **Team Admin** (Líder de Alpinismo)
1. Recebe acesso ao projeto
2. Cria inspeção de fachada
3. Marca patologias encontradas
4. Cria pontos de ancoragem no mapa
5. Designa técnicos para testes
6. Gera relatórios

### 3. **Technician** (Técnico)
1. Recebe notificação de pontos
2. Vai a campo com tablet/celular
3. Realiza testes nos pontos
4. Registra lacre e fotos
5. Sincroniza dados

---

## 🎯 Páginas por Role

### Todos os Roles
- `/app` - Dashboard principal (conteúdo varia)
- `/configuracoes` - Configurações (funcionalidades variam)
- `/auth/login` - Login
- `/auth/register` - Registro

### Superadmin Exclusivo
- `/admin` - Painel administrativo

### Company Admin + Superadmin
- `/billing` - Gestão de assinaturas

### Team Admin + Company Admin + Superadmin
- `/patologias?projectId={id}` - Visualização de patologias

### Public (Sem autenticação)
- `/public/project/[token]` - Visualização pública de inspeção

---

## 📱 Funcionalidades PWA (Todos os Roles)

- ✅ **Trabalho Offline**
- ✅ **Captura de fotos** (qualidade 100%)
- ✅ **Sincronização automática**
- ✅ **Cache de dados**
- ✅ **Notificações push**

---

**Última atualização**: 2025-01-12
**Versão do documento**: 1.0
