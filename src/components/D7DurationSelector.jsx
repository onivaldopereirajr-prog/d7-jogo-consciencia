const PRESETS = [
  { minutes: 1, title: 'Iniciação', detail: 'Entrada breve no foco ritual.' },
  { minutes: 3, title: 'Três Colunas', detail: 'Três ciclos de respiração e presença.' },
  { minutes: 7, title: 'Ciclo D7', detail: 'Ritual central da prática curta.' },
  { minutes: 10, title: 'Sefirot', detail: 'Eco simbólico das dez sefirot.' },
  { minutes: 12, title: 'Caminhos', detail: 'Travessia simbólica em doze passagens.' },
  { minutes: 21, title: 'Portal 21', detail: 'Prática de travessia, foco e permanência.', highlight: true },
  { minutes: 22, title: 'Letras Hebraicas', detail: 'Vinte e duas letras como mapa narrativo.' },
  { minutes: 33, title: 'Ascensão', detail: 'Prática longa para presença sustentada.' },
  { minutes: 42, title: 'Travessia', detail: 'Leitura ritual de passagem e retorno.' },
  { minutes: 49, title: 'Sete vezes Sete', detail: 'Ciclo de integração e repetição consciente.' },
  { minutes: 72, title: 'Nome e Luz', detail: 'Nome, som e brilho em curva longa.' },
  { minutes: 108, title: 'Presença Total', detail: 'Ciclo longo para foco profundo.', highlight: true },
]

const NUMBER_GUIDE = [
  '7 ciclo central',
  '10 sefirot simbólicas',
  '12 caminhos simbólicos',
  '21 portal de travessia',
  '22 letras hebraicas',
  '49 sete ciclos de sete',
  '72 nome e luz',
  '108 presença total',
]

function DurationButton({ preset, active, disabled, onSelect }) {
  return (
    <button
      type="button"
      className={`duration-preset ${active ? 'active' : ''} ${preset.highlight ? 'highlight' : ''}`}
      aria-pressed={active}
      onClick={() => onSelect(preset.minutes)}
      disabled={disabled}
    >
      <strong>{preset.minutes} min</strong>
      <span>{preset.title}</span>
      <small>{preset.detail}</small>
    </button>
  )
}

export default function D7DurationSelector({
  value,
  onChange,
  customValue,
  onCustomChange,
  error,
  disabled = false,
}) {
  const selectedPreset = PRESETS.find((preset) => preset.minutes === value) ?? PRESETS[2]
  const selectedLabel = selectedPreset.highlight ? `${selectedPreset.title} ${selectedPreset.minutes}` : selectedPreset.title

  function handleCustomChange(event) {
    const input = event.target.value
    onCustomChange(input)
  }

  return (
    <section className="duration-selector" aria-labelledby="duration-selector-title">
      <div className="duration-selector__head">
        <div>
          <span className="overline">Tempo ritual</span>
          <h3 id="duration-selector-title">Escolha seu tempo ritual</h3>
          <p>Selecione uma duração para permanecer em foco, presença e símbolos vivos.</p>
        </div>
        <div className="duration-selector__badge" aria-live="polite">
          <strong>{selectedPreset.minutes} min</strong>
          <span>{selectedPreset.title}</span>
        </div>
      </div>

      <div className="duration-selector__grid" role="list" aria-label="Presets simbólicos de duração">
        {PRESETS.map((preset) => (
          <DurationButton
            key={preset.minutes}
            preset={preset}
            active={preset.minutes === value}
            disabled={disabled}
            onSelect={onChange}
          />
        ))}
      </div>

      <div className="duration-selector__detail" aria-live="polite">
        <strong>{selectedPreset.minutes === 108 ? 'Presença Total 108' : selectedLabel}</strong>
        <p>{selectedPreset.detail}</p>
        {selectedPreset.minutes === 21 && <small>Portal 21 destaca travessia, foco e permanência.</small>}
        {selectedPreset.minutes === 108 && <small>Recomendado apenas quando houver tempo e ambiente adequados.</small>}
      </div>

      <div className="duration-selector__custom">
        <label htmlFor="practice-duration-custom">Minutos personalizados</label>
        <div className="duration-selector__custom-row">
          <input
            id="practice-duration-custom"
            type="number"
            inputMode="numeric"
            min="1"
            max="108"
            step="1"
            value={customValue}
            onChange={handleCustomChange}
            disabled={disabled}
            aria-describedby={error ? 'practice-duration-error' : 'practice-duration-help'}
          />
          <span id="practice-duration-help">1 a 108 min</span>
        </div>
        {error && <p id="practice-duration-error" className="duration-selector__error" role="alert">{error}</p>}
      </div>

      <div className="duration-selector__numbers" aria-label="Números simbólicos do D7">
        {NUMBER_GUIDE.map((item) => <span key={item}>{item}</span>)}
      </div>
    </section>
  )
}
