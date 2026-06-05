/* NaturoDesk — Tweaks panel app (mounts into #tweaks-root) */
const { useEffect } = React;

const NaturoTweakDefaults = /*EDITMODE-BEGIN*/{
  "hero": "split",
  "serif": "playfair",
  "accent": "#799664"
}/*EDITMODE-END*/;

function NaturoTweaks() {
  const [t, setTweak] = useTweaks(NaturoTweakDefaults);

  useEffect(() => {
    const r = document.documentElement;
    r.dataset.hero = t.hero;
    r.dataset.serif = t.serif;
    r.style.setProperty('--sage', t.accent);
    // recompute open FAQ heights in case layout shifted
    document.querySelectorAll('.faq__item.open .faq__a').forEach(a => { a.style.maxHeight = a.scrollHeight + 'px'; });
  }, [t.hero, t.serif, t.accent]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Hero — composition" />
      <TweakRadio
        label="Mise en page"
        value={t.hero}
        options={[
          { value: 'split', label: 'Split' },
          { value: 'editorial', label: 'Éditorial' },
          { value: 'layered', label: 'Calques' },
        ]}
        onChange={(v) => setTweak('hero', v)}
      />
      <TweakSection label="Typographie" />
      <TweakRadio
        label="Police des titres"
        value={t.serif}
        options={[
          { value: 'playfair', label: 'Playfair' },
          { value: 'cormorant', label: 'Cormorant' },
          { value: 'fraunces', label: 'Fraunces' },
        ]}
        onChange={(v) => setTweak('serif', v)}
      />
      <TweakSection label="Couleur" />
      <TweakColor
        label="Accent"
        value={t.accent}
        options={['#799664', '#5E7349', '#92806E', '#B5895F']}
        onChange={(v) => setTweak('accent', v)}
      />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('tweaks-root')).render(<NaturoTweaks />);
