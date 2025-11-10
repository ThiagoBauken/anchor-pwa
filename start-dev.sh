#!/bin/bash
# Limpa variáveis de ambiente antigas
unset DATABASE_URL
unset POSTGRES_HOST_INTERNAL

# Inicia o servidor de desenvolvimento
npm run dev
