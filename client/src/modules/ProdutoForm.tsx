import { useState, type FormEvent } from 'react';
import {
  CATEGORIAS_PRODUTO,
  type CadastroProdutoInput,
  type CategoriaProduto,
} from '../../../src/shared/contracts';
import { Banner } from '../components/Feedback';
import {
  validarCadastroProduto,
  type CamposCadastroProduto,
} from '../utils/produtos';

const CAMPOS_INICIAIS: CamposCadastroProduto = {
  sku: '',
  nome: '',
  categoria: 'Outros',
  preco: '',
  quantidade: '',
  estoqueMinimo: '5',
};

interface ProdutoFormProps {
  salvando: boolean;
  onCadastrar: (dados: CadastroProdutoInput) => Promise<boolean>;
}

export function ProdutoForm({ salvando, onCadastrar }: ProdutoFormProps) {
  const [campos, setCampos] = useState<CamposCadastroProduto>(CAMPOS_INICIAIS);
  const [erro, setErro] = useState<string | null>(null);

  function atualizarCampo<K extends keyof CamposCadastroProduto>(
    campo: K,
    valor: CamposCadastroProduto[K],
  ) {
    setCampos((atuais) => ({ ...atuais, [campo]: valor }));
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    const resultado = validarCadastroProduto(campos);
    if (!resultado.valido) {
      setErro(resultado.mensagem);
      return;
    }

    if (await onCadastrar(resultado.dados)) {
      setCampos(CAMPOS_INICIAIS);
    }
  }

  return (
    <section className="card estoque-cadastro" aria-labelledby="titulo-cadastro-produto">
      <h2 id="titulo-cadastro-produto">Cadastrar produto</h2>
      <p className="texto-apoio">Informe os dados do item que será disponibilizado no catálogo.</p>

      {erro && (
        <Banner tipo="erro" onFechar={() => setErro(null)}>
          {erro}
        </Banner>
      )}

      <form className="produto-form" onSubmit={(evento) => void enviar(evento)} noValidate>
        <label className="campo">
          Nome <span aria-hidden="true">*</span>
          <input
            name="nome"
            autoComplete="off"
            required
            value={campos.nome}
            onChange={(evento) => atualizarCampo('nome', evento.target.value)}
          />
        </label>

        <label className="campo">
          SKU (opcional)
          <input
            name="sku"
            autoComplete="off"
            placeholder="Gerado automaticamente"
            value={campos.sku}
            onChange={(evento) => atualizarCampo('sku', evento.target.value.toUpperCase())}
          />
        </label>

        <label className="campo">
          Categoria <span aria-hidden="true">*</span>
          <select
            name="categoria"
            value={campos.categoria}
            onChange={(evento) =>
              atualizarCampo('categoria', evento.target.value as CategoriaProduto)
            }
          >
            {CATEGORIAS_PRODUTO.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </select>
        </label>

        <label className="campo">
          Preço unitário (R$) <span aria-hidden="true">*</span>
          <input
            name="preco"
            inputMode="decimal"
            placeholder="0,00"
            required
            value={campos.preco}
            onChange={(evento) => atualizarCampo('preco', evento.target.value)}
          />
        </label>

        <label className="campo">
          Quantidade inicial <span aria-hidden="true">*</span>
          <input
            name="quantidade"
            type="number"
            min="1"
            step="1"
            required
            value={campos.quantidade}
            onChange={(evento) => atualizarCampo('quantidade', evento.target.value)}
          />
        </label>

        <label className="campo">
          Estoque mínimo <span aria-hidden="true">*</span>
          <input
            name="estoqueMinimo"
            type="number"
            min="0"
            step="1"
            required
            value={campos.estoqueMinimo}
            onChange={(evento) => atualizarCampo('estoqueMinimo', evento.target.value)}
          />
        </label>

        <button type="submit" className="btn btn-primario" disabled={salvando}>
          {salvando ? 'Cadastrando...' : 'Cadastrar produto'}
        </button>
      </form>
    </section>
  );
}
