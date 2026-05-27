# Constituição Operacional V1: Ficha CoC 7e

Este documento define as regras inegociáveis para a V1 do projeto. O objetivo é **sobrevivência, simplicidade e confiabilidade**, não sofisticação técnica.

## 1. Identidade do Produto
* **O que é:** Um "Papel Digital Operacional".
* **Posicionamento:** Funciona offline, abre instantaneamente, não interrompe a narrativa.
* **O que NÃO é:** Um VTT (Virtual Tabletop). Não tentaremos simular mapas, tokens ou automação complexa de combate.

## 2. Pilares Técnicos (Invioláveis)
* **Zero-Build:** HTML/CSS/JS Vanilla. Rodará em qualquer browser até 2030 sem `node_modules`.
* **State Management:** DDAU (Data-Down, Actions-Up). O estado em memória é a única fonte da verdade. O DOM é apenas um espelho do estado.
* **Persistência:** `localStorage` com `schemaVersion` obrigatório. Sem `schemaVersion`, o save não é carregado.
* **Segurança:** Delegação de eventos na raiz (`app-root`). Zero listeners espalhados pelo DOM.

## 3. Regras de Ouro (A "Constituição")
1. **Regra da Invisibilidade:** Se uma feature exige atenção demais ou abre muitos modais, ela deve morrer.
2. **Regra do Papel Superior:** Se papel e caneta forem mais rápidos para o Guardião, a feature não deve existir.
3. **Regra da Sobrevivência Solo:** O projeto deve ser mantível por UMA pessoa cansada daqui a 3 anos. Se exige complexidade, corte.
4. **Regra da Não-Refatoração:** Só refatore o que estiver doendo (causando bugs ou impedindo feature crítica). Elegância é secundária à funcionalidade.

## 4. O "Núcleo Sagrado" (Indispensável na V1)
* **Investigador:** Atributos, perícias, rolagens (`Dice.js`), SAN/PV/MP, estado persistente.
* **Mestre:** Consulta rápida de bestiário (texto), rolagens rápidas.
* **Interface:** Mobile-first (HUD fixo, abas de alta relevância).
* **Backup:** Exportar/Importar JSON + Backup Fantasma automático.

## 5. Checklist de Lançamento (Smoke Test)
* [ ] **Teste do Avião:** Funciona 100% offline (file://)?
* [ ] **Teste de Corrupção:** O app sobrevive a um `localStorage` inválido sem mostrar tela branca?
* [ ] **Teste de Mesa Real:** Rolagens de combate e sanidade consomem o tempo esperado (rápido)?
* [ ] **Teste de Retenção:** O PWA está configurado para forçar a retenção no iOS (ITP)?

## 6. O que transformará em referência
* **Ergonomia:** O jogador nunca precisa trocar de aba para realizar ações críticas de combate.
* **Confiança:** O sistema de Backup Fantasma garante que ninguém perca fichas de campanhas longas.
* **Impressão:** O PDF impresso (@media print) é idêntico à ficha de papel clássica.

---
*Mantenha simples. Mantenha mortal.*
