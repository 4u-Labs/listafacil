# 4U ListaFácil Pro — Gerador de Estrutura de Arquivos & Árvore para IA

> **4U ListaFácil Pro** é um analisador universal de arquivos e diretórios que roda **100% no navegador (Client-Side & Zero-Knowledge)**. Transforme pastas locais em árvores ASCII (estilo comando `tree`), gere prompts estruturados para inteligência artificial (ChatGPT, Claude, Gemini), exporte para planilhas CSV com suporte nativo a acentuação no Excel, audite arquivos pesados e identifique duplicatas sem enviar nada para servidores externos.

---

## 🌟 Principais Recursos

### 1. 🚀 Compatibilidade Universal & Arrastar e Soltar (Drag & Drop)
- **File System Access API**: Seleção rápida de pastas em navegadores compatíveis (Chrome, Edge, Brave, Opera).
- **Fallback Automático**: Suporte instantâneo para navegadores que não suportam a API de diretórios moderna (Firefox, Safari, smartphones e tablets).
- **Arrastar e Soltar Nativo**: Arraste pastas inteiras diretamente do gerenciador de arquivos (Windows Explorer, Finder, Nautilus/Dolphin no Linux) para qualquer parte da janela.

### 2. 🌲 Árvore Hierárquica & Comando `tree`
- **Árvore Interativa**: Expanda e recolha subpastas com contagem de itens e soma total de tamanho acumulado por pasta.
- **Saída ASCII (Comando `tree`)**: Representação pura com conectores `├──` e `└──`, ideal para documentação de repositórios, wikis e arquivos `README.md`.

### 3. 🤖 Gerador de Prompts para Inteligência Artificial
- Botão **"Copiar para Prompt de IA"**: Gera um bloco markdown completo contendo o resumo estatístico, contagem de tipos de arquivo e a árvore estrutural pronta para fornecer contexto de projeto para assistentes como ChatGPT, Claude, Gemini, Cursor ou GitHub Copilot.

### 4. 📊 Formatos de Exportação
- **Planilha CSV (.csv)**: Exportação com caractere BOM UTF-8 (`\uFEFF`) para abrir no Microsoft Excel sem corromper acentos, contendo Nome, Caminho Relativo, Pasta, Extensão, Categoria, Tamanho Formatado, Bytes e Data.
- **Tabela Markdown (.md)**: Tabela formatada pronta para documentação.
- **Arquivo JSON (.json)**: Dados brutos estruturados para scripts e integrações.
- **Lista de Texto Puro (.txt)**: Nomes ou caminhos relativos isolados.

### 5. 📈 Diagnóstico de Armazenamento & Disco
- **Top 10 Maiores Arquivos ("Space Hogs")**: Identifica rapidamente os arquivos que mais ocupam espaço no disco com barras percentuais.
- **Detector de Duplicatas**: Identifica arquivos de mesmo nome e tamanho idêntico em diferentes pastas.
- **Barra de Ocupação por Categoria**: Visualização proporcional do espaço utilizado por Código, Imagens, Documentos, Vídeos, Áudio, Compactados e Outros.

### 6. 🔍 Filtros Inteligentes
- **Filtro de Pastas de Desenvolvimento**: Opção de ignorar pastas pesadas como `.git`, `node_modules`, `.vscode`, `vendor`, `__pycache__`, `.next`, etc.
- **Pílulas Clicáveis por Categoria**: Filtre instantaneamente por Código, Imagens, Documentos, Vídeos, etc.
- **Filtro por Faixa de Tamanho**: `< 100 KB`, `100 KB a 10 MB`, `10 MB a 100 MB`, `> 100 MB`.
- **Busca em Tempo Real** por nome ou caminho com tecla de atalho rápida (`/`).

---

## 🔒 Privacidade & Segurança (Zero-Knowledge)
Todos os arquivos selecionados são lidos única e exclusivamente na memória temporária do navegador (*client-side*). Nenhum arquivo, caminho ou metadado é transmitido para qualquer servidor ou terceiro.

---

## ⌨️ Atalhos de Teclado
| Atalho | Ação |
| :--- | :--- |
| `Ctrl + O` / `Cmd + O` | Abrir seletor de pasta |
| `/` | Focar na barra de busca |
| `Esc` | Limpar campo de busca |

---

## 🛠️ Tecnologias
- **HTML5 & Vanilla JavaScript Moderno (ES6+)**
- **Tailwind CSS**
- **Glassmorphism Design System 4U**
- **File System Access API & FileSystemDirectoryEntry**

---

© 2026 [4U.IA.BR](https://4u.ia.br) — Todos os direitos reservados.
