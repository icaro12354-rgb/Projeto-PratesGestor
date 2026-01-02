# Como colocar Domínio Próprio (PratesGestor)

Seu sistema já utiliza a infraestrutura do Google Firebase. Para adicionar um domínio próprio (ex: `www.suaescola.com.br`), siga este roteiro.

## Passo 1: Comprar o Domínio (O Endereço)
Você precisa registrar o nome que deseja usar. Isso custa cerca de R$ 40,00 por ano.

**Recomendação Oficial (Brasil):**
Utilize o **[Registro.br](https://registro.br)**. É o órgão oficial, mais seguro, mais barato e aceita PIX/Boleto.

**Como fazer:**
1. Acesse **[https://registro.br](https://registro.br)**.
2. Digite o nome da sua escola na busca (ex: `escolaprates`).
3. Se aparecer **"Disponível"**, clique em **Registrar**.
4. Crie uma conta com seu CPF ou CNPJ.
5. Pague a taxa anual (R$ 40,00).
6. Aguarde o e-mail de confirmação (pode levar alguns minutos).

*Obs: Se você quiser um nome `.com` (sem o .br), precisará usar sites como GoDaddy ou Google Domains, que costumam ser mais caros na renovação.*

---

## Passo 2: Preparar o Projeto para Publicação
No seu terminal (onde você roda o projeto), execute os comandos para enviar seu código para o Firebase:

1. Instale as ferramentas do Firebase (se não tiver):
   ```bash
   npm install -g firebase-tools
   ```

2. Faça login no Google:
   ```bash
   firebase login
   ```

3. Gere a versão final do seu site (Build):
   ```bash
   npm run build
   ```
   *(Isso criará uma pasta chamada `dist` com seu site otimizado)*

4. Envie para a internet (Deploy):
   ```bash
   firebase deploy
   ```
   *(Após isso, o terminal mostrará um link provisório. Seu sistema já está online!)*

---

## Passo 3: Conectar o Domínio no Firebase

1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. Selecione seu projeto **pratesgestor**.
3. No menu lateral esquerdo, clique em **Hosting**.
4. Clique no botão **Adicionar domínio personalizado**.
5. Digite o domínio que você comprou no Passo 1 (ex: `escolaprates.com.br`).
6. Marque a caixa "Redirecionar domínio raiz para www" se desejar.
7. O Firebase vai te dar alguns códigos (Endereço IP ou TXT). Não feche essa janela.

---

## Passo 4: Configurar o DNS (No Registro.br)

Agora você precisa dizer ao Registro.br que o seu domínio deve apontar para o Firebase.

1. Volte ao site do **Registro.br** e faça login.
2. Clique sobre o domínio que você comprou.
3. Role até a seção **DNS** e clique em **"Editar Zona"** (ou Configurar DNS).
4. Clique em **"Modo Avançado"** se necessário.
5. Clique em **"Nova Entrada"**.
   - **Tipo:** Escolha `A`.
   - **Nome:** Deixe em branco (ou use `@`).
   - **Destino/IP:** Cole o número IP que o Firebase te mostrou.
6. Crie outra entrada se o Firebase pedir (geralmente para o `www`).
7. Salve as alterações.

*Nota: A propagação (o tempo para começar a funcionar) pode levar de 1 hora até 24 horas.*

---

## Passo 5: Autorizar o Domínio (Importante!)

Para que o login (Google/Email) funcione no novo site:

1. No Console do Firebase, vá em **Authentication** > **Settings (Configurações)**.
2. Clique na aba **Domínios autorizados**.
3. Clique em "Adicionar domínio".
4. Digite o seu novo domínio (ex: `escolaprates.com.br`).

---

🎉 **Pronto!**
Após a propagação do DNS, ao acessar `www.escolaprates.com.br`, seu sistema abrirá com o cadeado de segurança (HTTPS) ativado automaticamente.