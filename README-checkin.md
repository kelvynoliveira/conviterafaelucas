# 📋 Instruções de Uso — Check-in Offline

> Sistema de check-in para o casamento de **Rafaela & Lucas** (12/07/2026)

---

## 🚀 Antes do Evento (Com Internet)

1. Gere o arquivo de convidados final:
   ```bash
   node scripts/generate-guests.js
   ```
2. Faça commit e push para o GitHub (deploy automático via Vercel).
3. No celular/tablet da equipe, abra:
   ```
   https://conviterafaelucas.vercel.app/checkin
   ```
4. Aguarde o banner **"✓ Lista carregada — funciona sem internet"** aparecer.
5. **Pronto.** A partir daqui, nenhuma conexão de rede é necessária.

---

## 📴 No Dia do Evento (Sem Internet)

O app já está carregado em memória. Basta:

| Ação | Como fazer |
|------|------------|
| Escanear QR Code | Toque em **"Iniciar Câmera"** e aponte para o QR do convidado |
| Buscar por nome | Digite o nome no campo de busca (mín. 2 letras) |
| Registrar entrada | Toque em **"Marcar como Entrou"** |
| Ver lista de entradas | Role para baixo na mesma tela |

---

## ⚠️ Atenção

- **Não feche ou recarregue a página** depois do carregamento (se reabrir, precisará de rede novamente para recarregar a lista).
- Os registros de entrada são salvos no navegador (`localStorage`) e persistem mesmo se a tela travar/apagar.
- Se um convidado já entrou, o sistema exibe aviso de **entrada duplicada** com o horário.

---

## 📦 Fluxo de Atualização do CSV

```
1. Preencha / atualize guests.csv
2. node scripts/generate-guests.js
3. git add . && git commit -m "update: lista de convidados"
4. git push origin main
5. Vercel deploya automaticamente
```

Os tokens são preservados entre gerações — QR Codes já enviados continuam válidos.

---

## 📱 Mensagem RSVP (enviada automaticamente pelo site)

Quando o convidado clica em **"Confirmar Presença"**, o WhatsApp abre com:

```
Confirmo minha presença ✅

Nome: João da Silva
Token: 8f86dbab
Acompanhantes: 1
```

E para recusa:
```
Não poderei ir ❌

Nome: João da Silva
Token: 8f86dbab
Acompanhantes: 1
```

---

## 🔗 Link personalizado por convidado

```
https://conviterafaelucas.vercel.app/?token=TOKEN
```

Execute `node scripts/generate-guests.js` para ver todos os links e mensagens WhatsApp prontas para disparo.
