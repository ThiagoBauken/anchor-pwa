# Configuração de Portas no Easypanel

## 🎯 Situação Atual

Você mencionou: **"a unica porta aberta e a porta 80"**

Isso está correto! Veja como funciona:

## 📊 Como Funciona a Arquitetura de Portas

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Internet  │  HTTPS  │   Easypanel  │  HTTP   │  Container  │
│   Browser   │ ──443──>│ Reverse Proxy│ ──9002──>│  Next.js    │
└─────────────┘         └──────────────┘         └─────────────┘
                         (porta 80/443)            (porta 9002)
```

### 1️⃣ Porta EXTERNA (Internet → Easypanel)
- **Porta 443 (HTTPS)**: Usuários acessam `https://anchorpwa.easypanel.host`
- **Porta 80 (HTTP)**: Redirecionamento automático para HTTPS
- Easypanel gerencia o certificado SSL automaticamente

### 2️⃣ Porta INTERNA (Easypanel → Container)
- **Porta 9002**: Container Next.js escuta nesta porta (definido no Dockerfile)
- Easypanel mapeia: `Container 9002 → Proxy 80/443`

## ✅ Configuração Correta no Easypanel

### Passo 1: Verificar Mapeamento de Porta

No Easypanel, na configuração do seu serviço:

1. **Ir em**: App → Settings → Ports
2. **Verificar**: Porta do container = `9002`
3. **Mapear para**: Porta externa `80` (HTTP) ou deixar Easypanel gerenciar

**Screenshot Exemplo:**
```
Container Port: 9002
External Port:  80 (ou deixe vazio para automático)
Protocol:       HTTP
```

### Passo 2: Variáveis de Ambiente (CRÍTICO!)

```env
# ✅ CORRETO - HTTPS com domínio (sem porta)
NEXTAUTH_URL=https://anchorpwa.easypanel.host

# ❌ ERRADO - Localhost ou HTTP
NEXTAUTH_URL=http://localhost:9002  # ❌ NÃO USE!
```

### Passo 3: Dockerfile (Já está correto)

```dockerfile
EXPOSE 9002
ENV PORT=9002
ENV HOSTNAME="0.0.0.0"
```

**Não precisa mudar nada no Dockerfile!**

## 🔍 Por Que Porta 9002 no Container?

O container pode rodar em qualquer porta internamente (3000, 8080, 9002, etc.).
O importante é:

1. **Container escuta na porta**: `9002` (definido no Dockerfile)
2. **Easypanel mapeia**: `9002 → 80/443`
3. **Usuários acessam**: `https://anchorpwa.easypanel.host` (porta 443 implícita)

## 🛠️ Se Precisar Mudar para Porta 80 no Container

Só faça isso se Easypanel exigir especificamente porta 80:

### Dockerfile (mudança)
```dockerfile
EXPOSE 80
ENV PORT=80
```

### Rebuild necessário
```bash
docker build -t anchorview .
# Ou rebuild no Easypanel UI
```

**⚠️ IMPORTANTE**: Antes de mudar, verifique se Easypanel aceita porta 9002!
Na maioria dos casos, 9002 funciona perfeitamente.

## ✅ Checklist Final

- [ ] NEXTAUTH_URL = `https://anchorpwa.easypanel.host` (sem porta)
- [ ] NEXT_PUBLIC_APP_URL = `https://anchorpwa.easypanel.host` (sem porta)
- [ ] Easypanel mapeia porta 9002 do container
- [ ] SSL/HTTPS gerenciado automaticamente pelo Easypanel
- [ ] Após mudar env vars, fazer rebuild do container

## 🎯 O Que Fazer Agora

1. **Copiar** variáveis de `EASYPANEL-ENV-CORRECTED.txt`
2. **Colar** no Easypanel → App → Environment Variables
3. **Salvar** e fazer **Rebuild** do container
4. **Testar** login em janela anônima
5. **Verificar** se sessão persiste após F5

---

**Última atualização**: 2025-11-10
