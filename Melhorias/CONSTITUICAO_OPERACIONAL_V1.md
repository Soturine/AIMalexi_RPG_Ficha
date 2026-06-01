# Constituição Operacional V3: Hub Narrativo CoC 7e

> ⚠️ **Fonte oficial de prioridades/roadmap: [`DIRETRIZ_OFICIAL_V1.md`](DIRETRIZ_OFICIAL_V1.md).**
> Estas regras operacionais permanecem **válidas e inegociáveis** — a diretriz as estende, não
> as substitui. Em conflito de *prioridade*, prevalece a diretriz.

Este documento define as regras absolutas e inegociáveis do projeto.

O objetivo principal não é construir um VTT, rede social ou plataforma SaaS.
O objetivo é criar uma ferramenta narrativa operacional extremamente rápida, confiável e invisível durante a mesa.

O sistema existe para:

* reduzir fricção operacional
* aumentar imersão
* sincronizar informações críticas
* permitir que o Mestre conduza a narrativa sem interrupções

---

# 1. Identidade do Produto

## O que é

Um Hub Narrativo Operacional para campanhas de Call of Cthulhu 7e.

Uma evolução moderna da ficha de papel:

* sincronizada
* persistente
* mobile-first
* invisível durante a mesa

---

## O que NÃO é

O projeto NÃO é:

* um VTT pesado
* simulador de mapas
* plataforma de tokens
* sistema de iluminação dinâmica
* MMORPG de mesa
* automação total do RPG

A narrativa sempre vem antes da tecnologia.

---

# 2. Filosofia Central

## Regra Suprema

A tecnologia deve desaparecer durante a sessão.

Se uma feature:

* interrompe a narrativa
* exige atenção excessiva
* adiciona complexidade mental
* cria fluxo burocrático

ela deve ser removida.

---

# 3. Princípios Arquiteturais

## 3.1 Offline-First

A ficha deve continuar funcional mesmo sem internet.

Toda ação crítica:

* permanece disponível offline
* salva localmente
* sincroniza quando a conexão retornar

A internet melhora a experiência.
Ela nunca pode ser obrigatória para o funcionamento básico da ficha.

---

## 3.2 Sincronização Oportunista

O sistema sincroniza estado quando possível.

A sincronização deve:

* reconectar automaticamente
* tolerar internet instável
* evitar perda de dados
* degradar graciosamente offline

Nenhuma tela pode depender exclusivamente de conexão contínua.

---

## 3.3 Estado é a Verdade

A interface nunca é a fonte da verdade.

A arquitetura deve seguir:

```text
Estado → Interface
```

Nunca:

```text
Interface → Estado
```

Toda sincronização ocorre via estado estruturado.

---

## 3.4 Simplicidade Operacional

O projeto deve continuar mantível por uma única pessoa no futuro.

Toda decisão técnica deve considerar:

* manutenção
* debugging
* previsibilidade
* clareza
* resistência ao caos

Arquitetura bonita não vale mais que arquitetura sustentável.

---

# 4. Stack Estratégica

## Frontend

Arquitetura progressivamente reativa baseada em Vanilla JS zero-build, com camada
reativa leve orientada a estado (Preact Signals vendado) e compatível com evolução futura.

Princípios obrigatórios:

* Offline-first
* PWA
* Mobile-first
* Fluxo unidirecional de estado
* Performance extrema

---

## Backend

Backend mínimo possível.

Prioridade para:

* Supabase
* PostgreSQL
* Realtime via WebSocket/Broadcast
* RLS (Row Level Security) — separação assimétrica Mestre/Jogador no banco

Evitar:

* backend custom complexo
* microserviços
* múltiplos servidores
* infraestrutura enterprise

---

## Persistência Local

Toda sessão deve possuir:

* cache local
* restauração automática
* recuperação de estado

---

# 5. Regras de Ouro

## Regra do Zero Cálculo

O jogador nunca calcula:

* metade
* quinto
* sucesso extremo
* dificuldade

O sistema resolve automaticamente.

---

## Regra da Invisibilidade

Menus profundos, popups excessivos e modais burocráticos são proibidos.

Toda ação crítica deve ocorrer em:

* 1 toque
* no máximo 2 interações

---

## Regra da Sobrevivência Solo

Se uma feature:

* aumenta drasticamente complexidade
* exige infraestrutura excessiva
* dificulta manutenção futura

ela deve ser simplificada ou removida.

---

## Regra da Performance Bruta

O sistema deve abrir instantaneamente mesmo em:

* celulares antigos
* conexões ruins
* mesas com internet instável

Tela branca é falha crítica.

---

## Regra do Mestre Onisciente

O Mestre nunca deve perguntar:

* SAN atual
* HP atual
* condição
* status crítico

As informações devem existir em tempo real no dashboard.

---

## Regra da Narrativa Superior

Se papel e caneta forem mais rápidos para determinada tarefa:

* a feature está errada
* ou não deveria existir

---

# 6. Modelo Operacional

## Sessões

O Mestre cria:

* campanha
* sessão
* código/link de acesso

Jogadores entram:

* por link mágico
* QR Code
* PIN opcional

Sem cadastro obrigatório para jogar.

---

## Investigadores

Cada investigador é uma entidade sincronizada.

O sistema monitora:

* SAN
* PV
* MP
* Sorte
* status
* inventário relevante
* condições mentais/físicas

---

## Mestre

O Mestre possui:

* dashboard em tempo real
* logs narrativos
* bestiário
* NPCs
* entidades ocultas
* anotações

---

# 7. Sistema de Logs

## Todo evento importante gera histórico

Exemplos:

* perda de SAN
* dano
* falha crítica
* combate
* testes importantes
* alterações relevantes

---

## O log deve servir à narrativa

O histórico deve funcionar como:

* memória da campanha
* trilha operacional
* auditoria narrativa

---

## O log nunca deve poluir a interface

Logs:

* são discretos
* rápidos
* contextualizados

---

# 8. Segurança

## Separação Assimétrica

Jogadores nunca podem acessar:

* informações ocultas
* entidades secretas
* dados internos do Mestre

Toda segurança deve existir:

* no banco
* nas permissões
* na sincronização

Nunca apenas na interface.

---

## Toda entidade possui permissões explícitas

O sistema deve assumir:

* acesso negado por padrão
* liberação apenas quando necessário

---

# 9. O Núcleo Sagrado

## Investigador

Obrigatório:

* atributos
* perícias
* rolagens
* SAN/PV/MP
* inventário
* persistência

---

## Dashboard do Mestre

Obrigatório:

* monitoramento em tempo real
* visão rápida de investigadores
* logs
* NPCs
* bestiário operacional

---

## Multiplayer

Obrigatório:

* sincronização leve
* reconexão automática
* entrada simples via link

---

## PWA

Obrigatório:

* instalação leve
* cache agressivo
* experiência semelhante a app nativo

---

# 10. O que NÃO entra no projeto

Não implementar:

* mapas complexos
* iluminação dinâmica
* animações pesadas
* combate automatizado extremo
* editor visual complexo
* chat completo estilo Discord
* features que desviem foco da narrativa

---

# 11. Smoke Tests Obrigatórios

## Teste de Sincronia

Mudanças críticas aparecem no dashboard do Mestre em menos de 1 segundo.

---

## Teste Offline

A ficha continua utilizável sem internet.

---

## Teste de Reconexão

Ao recuperar conexão:

* estado sincroniza
* sem perda de dados
* sem corrupção

---

## Teste de Performance

O sistema roda fluidamente em:

* celulares intermediários
* dispositivos de 4+ anos

---

## Teste de Segurança

Jogadores não conseguem acessar:

* dados ocultos
* endpoints administrativos
* entidades secretas

---

# 12. O Diferencial do Projeto

O diferencial NÃO é:

* ficha digital
* rolagem automática
* interface bonita

O diferencial é:

## O Mestre possuir uma visão narrativa viva da mesa em tempo real.

O sistema existe para:

* reduzir fricção
* aumentar tensão
* acelerar narrativa
* eliminar tracking manual
* transformar a mesa em uma experiência fluida

---

# 13. Princípio Final

O sistema deve parecer:

* invisível como papel
* rápido como texto
* inteligente como software moderno

Sem burocracia.
Sem excesso.
Sem interromper o horror.

---

*Mantenha rápido. Mantenha invisível. Mantenha narrativo.*
