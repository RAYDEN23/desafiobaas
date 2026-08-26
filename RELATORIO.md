# Relatório de correção — Nexus dos Heróis

Este relatório documenta os oito bugs corrigidos no projeto, incluindo o comportamento observado, a causa técnica, os trechos de código antes e depois e o resultado obtido.

## BUG #01 — Login silencia erros

**Arquivo:** `src/app/(auth)/login/page.tsx`  
**Função:** `handleSubmit`  
**Conceito:** tratamento de erros do Firebase Authentication

### O que estava acontecendo

Ao informar uma senha incorreta ou um e-mail inexistente, o Firebase lançava um erro, mas nenhuma mensagem era exibida. O formulário aparentava permanecer travado em **"Entrando..."**.

### Por que acontecia

O bloco `catch` estava vazio. A exceção era capturada, mas o estado `erro` nunca era atualizado. A correção interpreta os códigos do Firebase Auth e finaliza o carregamento no bloco `finally`.

### Como corrigi

**Antes:**

```ts
} catch {
  // catch vazio — erro engolido
}
```

**Depois:**

```ts
} catch (err) {
  const msg = err instanceof Error ? err.message : "Erro desconhecido";
  if (msg.includes("invalid-credential") || msg.includes("wrong-password")) {
    setErro("E-mail ou senha incorretos.");
  } else if (msg.includes("user-not-found")) {
    setErro("Nenhuma conta encontrada com este e-mail.");
  } else {
    setErro("Erro ao entrar. Tente novamente.");
  }
} finally {
  setCarregando(false);
}
```

### Screenshot ou resultado

> As imagens abaixo correspondem aos anexos enviados: primeiro o estado com o bug e depois o estado corrigido. Salve os anexos na pasta `screenshots/` com os nomes indicados para que o Markdown os exiba no relatório.

**Antes:**

![BUG 01 antes da correção](screenshots/bug-01-antes.png)

**Depois:**

![BUG 01 depois da correção](screenshots/bug-01-depois.png)

Com senha incorreta, a tela passou a exibir **"E-mail ou senha incorretos."**. Para e-mail inexistente, exibe **"Nenhuma conta encontrada com este e-mail."**.

---

## BUG #02 — Middleware com condição invertida

**Arquivo:** `middleware.ts`  
**Função:** `middleware`  
**Conceito:** proteção de rotas no Next.js e operador de negação

### O que estava acontecendo

A lógica de proteção das rotas permitia que usuários não autenticados acessassem o dashboard e outras páginas protegidas. A condição também poderia redirecionar usuários que já tinham sessão.

### Por que acontecia

O código verificava `if (token)`, ou seja, redirecionava quando o token existia. Para proteger uma rota, o redirecionamento deve ocorrer quando o token **não** existe.

### Como corrigi

**Antes:**

```ts
if (token) {
  return NextResponse.redirect(new URL("/login", request.url));
}
```

**Depois:**

```ts
if (!token) {
  return NextResponse.redirect(new URL("/login", request.url));
}
```

### Screenshot ou resultado

**Antes:**

![BUG 02 antes da correção](screenshots/bug-02-antes.png)

**Depois:**

![BUG 02 depois da correção](screenshots/bug-02-depois.png)

Ao acessar `/dashboard`, `/criar-personagem` ou `/personagem` sem sessão, o usuário agora é redirecionado para `/login`. Usuários autenticados continuam acessando essas rotas.

---

## BUG #03 — Confirmação de senha compara com o nome

**Arquivo:** `src/app/(auth)/cadastro/page.tsx`  
**Função:** validação do formulário de cadastro  
**Conceito:** validação de formulários

### O que estava acontecendo

O cadastro comparava a senha com o campo `nome`, em vez de comparar as duas senhas. Assim, a confirmação de senha não era validada corretamente.

### Por que acontecia

A condição usava a variável errada: `senha !== nome`. O valor correto para confirmar a senha está em `confirmarSenha`.

### Como corrigi

**Antes:**

```ts
if (senha !== nome) {
```

**Depois:**

```ts
if (senha !== confirmarSenha) {
```

### Screenshot ou resultado

**Antes:**

![BUG 03 antes da correção](screenshots/bug-03-antes.png)

**Depois:**

![BUG 03 depois da correção](screenshots/bug-03-depois.png)

Ao digitar senhas diferentes, o cadastro agora é interrompido e informa que as senhas não coincidem. Quando os valores são iguais, a validação pode prosseguir.

---

## BUG #04 — Query sem filtro de `userId`

**Arquivo:** `src/services/personagens.ts`  
**Função:** `listarPersonagens`  
**Conceito:** consultas do Firestore e isolamento de dados por usuário

### O que estava acontecendo

O dashboard carregava personagens de todos os usuários, expondo dados de outros jogadores.

### Por que acontecia

A consulta buscava a coleção inteira sem uma cláusula `where`. O Firestore precisa receber o `userId` do usuário autenticado para filtrar os documentos pertencentes a ele.

### Como corrigi

**Antes:**

```ts
const q = query(collection(db, "personagens"));
```

**Depois:**

```ts
const q = query(
  collection(db, "personagens"),
  where("userId", "==", uid)
);
```

Também foi incluído o import de `where`:

```ts
import { where } from "firebase/firestore";
```

### Screenshot ou resultado

**Antes:**

![BUG 04 antes da correção](screenshots/bug-04-antes.png)

**Depois:**

![BUG 04 depois da correção](screenshots/bug-04-depois.png)

O dashboard agora lista somente os personagens cujo campo `userId` corresponde ao usuário logado.

---

## BUG #05 — Nome de coleção errado no create

**Arquivo:** `src/services/personagens.ts`  
**Função:** `criarPersonagem`  
**Conceito:** nomes de coleções no Firestore

### O que estava acontecendo

O formulário confirmava a criação do personagem, mas o novo herói não aparecia no dashboard.

### Por que acontecia

O `addDoc` salvava em `personagem`, no singular, enquanto a listagem consultava `personagens`, no plural. No Firestore, esses nomes representam coleções diferentes.

### Como corrigi

**Antes:**

```ts
const ref = await addDoc(collection(db, "personagem"), { ... });
```

**Depois:**

```ts
const ref = await addDoc(collection(db, "personagens"), { ... });
```

### Screenshot ou resultado

**Antes:**

![BUG 05 antes da correção](screenshots/bug-05-antes.png)

**Depois:**

![BUG 05 depois da correção](screenshots/bug-05-depois.png)

Depois da criação, o personagem é salvo na mesma coleção usada pelo dashboard e passa a aparecer na lista normalmente.

---

## BUG #06 — `setDoc` apaga o documento inteiro

**Arquivo:** `src/services/personagens.ts`  
**Função:** `equiparItem`  
**Conceito:** diferença entre `setDoc` e `updateDoc`

### O que estava acontecendo

Ao equipar um item, os dados anteriores do personagem, como nome, classe e outros equipamentos, desapareciam.

### Por que acontecia

`setDoc` substitui o documento inteiro pelo objeto enviado. Como o código enviava apenas o slot alterado, todos os demais campos eram removidos.

### Como corrigi

**Antes:**

```ts
await setDoc(doc(db, "personagens", personagemId), { [slot]: itemId });
```

**Depois:**

```ts
await updateDoc(doc(db, "personagens", personagemId), { [slot]: itemId });
```

### Screenshot ou resultado

**Antes:**

![BUG 06 antes da correção](screenshots/bug-06-antes.png)

**Depois:**

![BUG 06 depois da correção](screenshots/bug-06-depois.png)

Equipar uma arma, armadura ou anel agora altera somente o slot escolhido e preserva todos os outros dados do personagem.

---

## BUG #07 — Deletar usa índice como ID

**Arquivo:** `src/services/personagens.ts`  
**Função:** `deletarPersonagem`  
**Conceito:** IDs de documentos do Firestore

### O que estava acontecendo

Ao excluir um personagem, o aplicativo podia remover o documento errado ou retornar um erro de documento inexistente.

### Por que acontecia

O índice da lista (`0`, `1`, `2`...) era usado como se fosse o ID do documento. O Firestore gera IDs aleatórios, que não correspondem à posição do item no array.

### Como corrigi

**Antes:**

```ts
await deleteDoc(doc(db, "personagens", String(indice)));
```

**Depois:**

```ts
await deleteDoc(doc(db, "personagens", personagem.id));
```

### Screenshot ou resultado

**Antes:**

![BUG 07 antes da correção](screenshots/bug-07-antes.png)

**Depois:**

![BUG 07 depois da correção](screenshots/bug-07-depois.png)

O botão de excluir agora usa o ID real do documento e remove exatamente o personagem selecionado, independentemente da posição dele na lista.

---

## BUG #08 — Security Rules abertas

**Arquivo:** `firestore.rules`  
**Conceito:** autenticação, autorização e `resource.data` no Firebase

### O que estava acontecendo

Qualquer pessoa podia ler, criar, alterar ou excluir qualquer documento do Firestore, mesmo sem estar autenticada e sem ser dona do personagem.

### Por que acontecia

As regras usavam `allow read, write: if true`. A expressão `if true` sempre permite a operação, eliminando toda a proteção do banco.

### Como corrigi

**Antes:**

```text
match /{document=**} {
  allow read, write: if true;
}
```

**Depois:**

```text
match /personagens/{personagemId} {
  allow read: if request.auth != null &&
              request.auth.uid == resource.data.userId;
  allow create: if request.auth != null &&
                request.auth.uid == request.resource.data.userId;
  allow update, delete: if request.auth != null &&
                        request.auth.uid == resource.data.userId;
}
```

Nas operações de leitura, atualização e exclusão, `resource.data` representa os dados existentes. Na criação, `request.resource.data` representa o documento que será criado. Assim, o usuário precisa estar autenticado e ser o proprietário do personagem.

### Screenshot ou resultado

**Antes:**

![BUG 08 antes da correção](screenshots/bug-08-antes.png)

**Depois:**

![BUG 08 depois da correção](screenshots/bug-08-depois.png)

Usuários não autenticados deixam de acessar os personagens. Usuários autenticados só conseguem ler, criar, atualizar e excluir documentos associados ao próprio `userId`.

---

## Conclusão

Os oito bugs foram documentados e corrigidos. O sistema agora trata os erros de login, protege as rotas, valida o cadastro, separa os dados por usuário, grava e atualiza personagens na coleção correta e aplica regras de segurança no Firestore.